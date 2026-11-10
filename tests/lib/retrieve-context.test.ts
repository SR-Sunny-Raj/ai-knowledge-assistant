import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  aggregate: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  connectToDatabase: mocks.connectToDatabase,
}));
vi.mock('@/lib/cloudflare-embeddings', () => ({
  embedQuery: vi.fn(),
}));
vi.mock('@/models/document-chunk', () => ({
  DocumentChunkModel: {
    aggregate: mocks.aggregate,
  },
}));

import { retrieveDocumentPages } from '@/lib/retrieve-context';

const documentId = '507f1f77bcf86cd799439011';

describe('retrieveDocumentPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectToDatabase.mockResolvedValue(undefined);
  });

  it('merges ordered owned chunks into one source per page', async () => {
    mocks.aggregate.mockResolvedValue([
      {
        content: 'Page one, first chunk.',
        pageNumber: 1,
        documentId,
        fileName: 'report.pdf',
      },
      {
        content: 'Page one, second chunk.',
        pageNumber: 1,
        documentId,
        fileName: 'report.pdf',
      },
      {
        content: 'Page two.',
        pageNumber: 2,
        documentId,
        fileName: 'report.pdf',
      },
    ]);

    const pages = await retrieveDocumentPages('user-a', documentId, 0.91);

    expect(pages).toEqual([
      {
        content: 'Page one, first chunk.\nPage one, second chunk.',
        pageNumber: 1,
        documentId,
        fileName: 'report.pdf',
        score: 0.91,
      },
      {
        content: 'Page two.',
        pageNumber: 2,
        documentId,
        fileName: 'report.pdf',
        score: 0.91,
      },
    ]);
    expect(mocks.connectToDatabase).toHaveBeenCalledOnce();

    const pipeline = mocks.aggregate.mock.calls[0][0];

    expect(pipeline[0].$match.ownerId).toBe('user-a');
    expect(pipeline[0].$match.documentId.toString()).toBe(documentId);
    expect(JSON.stringify(pipeline[1])).toContain('user-a');
  });

  it('rejects invalid document IDs before accessing the database', async () => {
    await expect(
      retrieveDocumentPages('user-a', 'not-an-object-id', 0.9),
    ).rejects.toThrow('A valid owned document is required for retrieval.');

    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
    expect(mocks.aggregate).not.toHaveBeenCalled();
  });
});
