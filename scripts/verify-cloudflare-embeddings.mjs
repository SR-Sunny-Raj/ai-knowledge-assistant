import { MongoClient } from 'mongodb';

const MODEL =
  process.env.CLOUDFLARE_EMBEDDING_MODEL ?? '@cf/baai/bge-base-en-v1.5';
const DIMENSIONS = 768;

function requireEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function embed(text) {
  const accountId = requireEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID');
  const token = requireEnvironmentVariable('CLOUDFLARE_API_TOKEN');
  const modelPath = MODEL.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], pooling: 'cls' }),
    },
  );
  const body = await response.json().catch(() => null);
  const embedding = body?.result?.data?.[0];

  if (
    !response.ok ||
    body?.success !== true ||
    !Array.isArray(embedding) ||
    embedding.length !== DIMENSIONS
  ) {
    const message =
      body?.errors?.find((error) => error?.message)?.message ??
      `Cloudflare returned status ${response.status}.`;
    throw new Error(message);
  }

  return { embedding, status: response.status };
}

const client = new MongoClient(requireEnvironmentVariable('MONGODB_URI'));

try {
  await client.connect();

  const database = client.db();
  const chunks = database.collection('documentchunks');
  const total = await chunks.countDocuments();
  const staged = await chunks.countDocuments({
    cloudflareEmbedding: { $exists: true },
  });
  const [embeddingSummary] = await chunks
    .aggregate([
      {
        $project: {
          valid: {
            $and: [
              { $isArray: '$embedding' },
              {
                $eq: [
                  {
                    $size: {
                      $cond: [{ $isArray: '$embedding' }, '$embedding', []],
                    },
                  },
                  DIMENSIONS,
                ],
              },
              {
                $allElementsTrue: {
                  $map: {
                    input: {
                      $cond: [{ $isArray: '$embedding' }, '$embedding', []],
                    },
                    as: 'value',
                    in: {
                      $in: [
                        { $type: '$$value' },
                        ['double', 'int', 'long', 'decimal'],
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          valid: { $sum: { $cond: ['$valid', 1, 0] } },
          invalid: { $sum: { $cond: ['$valid', 0, 1] } },
        },
      },
    ])
    .toArray();

  const source = await chunks.findOne(
    { embedding: { $type: 'array' } },
    { projection: { content: 1, ownerId: 1, documentId: 1 } },
  );

  if (!source) {
    throw new Error(
      'No embedded chunk is available for retrieval verification.',
    );
  }

  const { embedding, status } = await embed(source.content);
  const matches = await chunks
    .aggregate([
      {
        $vectorSearch: {
          index: 'document_embedding_index',
          path: 'embedding',
          queryVector: embedding,
          filter: { ownerId: source.ownerId },
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $lookup: {
          from: 'documents',
          let: { matchedDocumentId: '$documentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$matchedDocumentId'] },
                    { $eq: ['$ownerId', source.ownerId] },
                  ],
                },
              },
            },
          ],
          as: 'document',
        },
      },
      {
        $project: {
          score: { $meta: 'vectorSearchScore' },
          sourceMatch: { $eq: ['$_id', source._id] },
          parentMatched: { $gt: [{ $size: '$document' }, 0] },
        },
      },
    ])
    .toArray();

  console.log(
    JSON.stringify({
      total,
      validEmbeddings: embeddingSummary?.valid ?? 0,
      invalidEmbeddings: embeddingSummary?.invalid ?? total,
      stagedFields: staged,
      cloudflareStatus: status,
      queryDimensions: embedding.length,
      retrievalHits: matches.length,
      topScore: matches[0]?.score ?? null,
      sourceRepresented: matches.some((match) => match.sourceMatch),
      parentMatched: matches.some((match) => match.parentMatched),
    }),
  );
} finally {
  await client.close();
}
