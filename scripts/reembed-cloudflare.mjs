import { MongoClient } from 'mongodb';

const MODEL =
  process.env.CLOUDFLARE_EMBEDDING_MODEL ?? '@cf/baai/bge-base-en-v1.5';
const DIMENSIONS = 768;
const BATCH_SIZE = 100;
const STAGING_FIELD = 'cloudflareEmbedding';

function requireEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function embed(texts) {
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
      body: JSON.stringify({ text: texts, pooling: 'cls' }),
    },
  );
  const body = await response.json().catch(() => null);
  const embeddings = body?.result?.data;

  if (
    !response.ok ||
    body?.success !== true ||
    !Array.isArray(embeddings) ||
    embeddings.length !== texts.length ||
    embeddings.some(
      (embedding) =>
        !Array.isArray(embedding) || embedding.length !== DIMENSIONS,
    )
  ) {
    const message =
      body?.errors?.find((error) => error?.message)?.message ??
      `Cloudflare returned status ${response.status}.`;
    throw new Error(message);
  }

  return embeddings;
}

const client = new MongoClient(requireEnvironmentVariable('MONGODB_URI'));

try {
  await client.connect();

  const chunks = client.db().collection('documentchunks');
  const pending = await chunks
    .find(
      { [STAGING_FIELD]: { $exists: false } },
      { projection: { _id: 1, content: 1 } },
    )
    .toArray();
  const total = await chunks.countDocuments();

  console.log(`Embedding ${pending.length} of ${total} chunks with ${MODEL}.`);

  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const embeddings = await embed(batch.map((chunk) => chunk.content));

    await chunks.bulkWrite(
      batch.map((chunk, index) => ({
        updateOne: {
          filter: { _id: chunk._id },
          update: { $set: { [STAGING_FIELD]: embeddings[index] } },
        },
      })),
    );

    console.log(
      `Staged ${Math.min(start + batch.length, pending.length)} of ${pending.length}.`,
    );
  }

  const validStaged = await chunks.countDocuments({
    [STAGING_FIELD]: { $type: 'array' },
    $expr: { $eq: [{ $size: `$${STAGING_FIELD}` }, DIMENSIONS] },
  });

  if (validStaged !== total) {
    throw new Error(
      `Migration stopped safely: ${validStaged} of ${total} chunks are staged. Run the command again to resume.`,
    );
  }

  const result = await chunks.updateMany({}, [
    { $set: { embedding: `$${STAGING_FIELD}` } },
    { $unset: STAGING_FIELD },
  ]);

  console.log(
    `Activated Cloudflare embeddings for ${result.modifiedCount} chunks.`,
  );
} finally {
  await client.close();
}
