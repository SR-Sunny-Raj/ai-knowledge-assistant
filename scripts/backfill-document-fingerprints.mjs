import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';

function requireEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function fingerprint(chunks) {
  const hash = createHash('sha256');

  for (const chunk of chunks) {
    hash.update(`${Buffer.byteLength(chunk.content, 'utf8')}:`);
    hash.update(chunk.content);
    hash.update(';');
  }

  return hash.digest('hex');
}

const client = new MongoClient(requireEnvironmentVariable('MONGODB_URI'));

try {
  await client.connect();

  const database = client.db();
  const documents = database.collection('documents');
  const chunks = database.collection('documentchunks');
  const messages = database.collection('conversationmessages');
  const records = await documents.find({}).sort({ createdAt: 1 }).toArray();
  const groups = new Map();

  for (const document of records) {
    const documentChunks = await chunks
      .find({ documentId: document._id }, { projection: { content: 1 } })
      .sort({ chunkIndex: 1 })
      .toArray();

    if (documentChunks.length === 0) {
      continue;
    }

    const contentHash = fingerprint(documentChunks);
    const key = `${document.ownerId}:${contentHash}`;
    const group = groups.get(key) ?? { contentHash, documents: [] };

    group.documents.push(document);
    groups.set(key, group);
  }

  let backfilled = 0;
  let removed = 0;
  let remappedMessages = 0;

  for (const group of groups.values()) {
    const [keeper, ...duplicates] = group.documents;

    await documents.updateOne(
      { _id: keeper._id },
      { $set: { contentHash: group.contentHash } },
    );
    backfilled += 1;

    for (const duplicate of duplicates) {
      const affectedMessages = await messages
        .find({ 'sources.documentId': duplicate._id })
        .toArray();

      for (const message of affectedMessages) {
        const sources = message.sources.map((source) =>
          source.documentId?.toString() === duplicate._id.toString()
            ? {
                ...source,
                documentId: keeper._id,
                fileName: keeper.fileName,
              }
            : source,
        );

        await messages.updateOne({ _id: message._id }, { $set: { sources } });
        remappedMessages += 1;
      }

      await documents.deleteOne({ _id: duplicate._id });
      await chunks.deleteMany({ documentId: duplicate._id });
      removed += 1;
    }
  }

  const indexName = await documents.createIndex(
    { ownerId: 1, contentHash: 1 },
    {
      name: 'ownerId_1_contentHash_1',
      unique: true,
      partialFilterExpression: {
        contentHash: { $type: 'string' },
      },
    },
  );

  console.log(
    JSON.stringify({
      documentsScanned: records.length,
      fingerprintsBackfilled: backfilled,
      duplicatesRemoved: removed,
      messagesRemapped: remappedMessages,
      indexName,
    }),
  );
} finally {
  await client.close();
}
