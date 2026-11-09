import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  documentFindOne: vi.fn(),
  documentDeleteOne: vi.fn(),
  chunkDeleteMany: vi.fn(),
  conversationFind: vi.fn(),
  conversationDeleteMany: vi.fn(),
  messageFind: vi.fn(),
  messageUpdateOne: vi.fn(),
  messageDistinct: vi.fn(),
  messageDeleteMany: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/lib/db', () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock('@/lib/session', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/models/document', () => ({
  DocumentModel: {
    findOne: mocks.documentFindOne,
    deleteOne: mocks.documentDeleteOne,
  },
}));

vi.mock('@/models/document-chunk', () => ({
  DocumentChunkModel: {
    deleteMany: mocks.chunkDeleteMany,
  },
}));

vi.mock('@/models/conversation', () => ({
  ConversationModel: {
    find: mocks.conversationFind,
    deleteMany: mocks.conversationDeleteMany,
  },
}));

vi.mock('@/models/conversation-message', () => ({
  ConversationMessageModel: {
    find: mocks.messageFind,
    updateOne: mocks.messageUpdateOne,
    distinct: mocks.messageDistinct,
    deleteMany: mocks.messageDeleteMany,
  },
}));

import { DELETE } from '@/app/api/documents/[id]/route';

const documentId = '507f1f77bcf86cd799439011';
const validDocumentId = '507f1f77bcf86cd799439012';
const conversationId = '507f1f77bcf86cd799439021';
const messageId = '507f1f77bcf86cd799439031';

function objectId(value: string) {
  return {
    toString: () => value,
  };
}

function queryResult<T>(value: T) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(value),
    }),
  };
}

function routeContext(id = documentId) {
  return {
    params: Promise.resolve({ id }),
  };
}

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-a',
      name: 'User A',
      email: 'user-a@example.com',
      image: null,
    });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.documentFindOne.mockReturnValue(
      queryResult({ _id: objectId(documentId) }),
    );
    mocks.conversationFind.mockReturnValue(
      queryResult([{ _id: objectId(conversationId) }]),
    );
    mocks.messageFind.mockReturnValue(queryResult([]));
    mocks.messageDistinct.mockResolvedValue([]);
    mocks.messageUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    mocks.messageDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.conversationDeleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.chunkDeleteMany.mockResolvedValue({ deletedCount: 1 });
    mocks.documentDeleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it('returns 401 before accessing the database when signed out', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await DELETE(
      new Request('http://localhost'),
      routeContext(),
    );

    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid document ID', async () => {
    const response = await DELETE(
      new Request('http://localhost'),
      routeContext('not-an-object-id'),
    );

    expect(response.status).toBe(400);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it('returns 404 when the document is not owned by the user', async () => {
    mocks.documentFindOne.mockReturnValue(queryResult(null));

    const response = await DELETE(
      new Request('http://localhost'),
      routeContext(),
    );

    expect(response.status).toBe(404);
    expect(mocks.documentFindOne).toHaveBeenCalledWith({
      _id: documentId,
      ownerId: 'user-a',
    });
    expect(mocks.chunkDeleteMany).not.toHaveBeenCalled();
  });

  it('removes only the deleted source and preserves a sourced conversation', async () => {
    const storedMessageId = objectId(messageId);
    const deletedSource = {
      number: 1,
      documentId: objectId(documentId),
      fileName: 'deleted.pdf',
      pageNumber: 1,
      score: 0.9,
    };
    const validSource = {
      number: 2,
      documentId: objectId(validDocumentId),
      fileName: 'valid.pdf',
      pageNumber: 2,
      score: 0.8,
    };

    mocks.messageFind.mockReturnValue(
      queryResult([
        {
          _id: storedMessageId,
          conversationId: objectId(conversationId),
          sources: [deletedSource, validSource],
        },
      ]),
    );
    mocks.messageDistinct.mockResolvedValue([objectId(conversationId)]);

    const response = await DELETE(
      new Request('http://localhost'),
      routeContext(),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.messageUpdateOne).toHaveBeenCalledWith(
      { _id: storedMessageId },
      {
        $set: {
          sources: [validSource],
        },
      },
    );
    expect(mocks.conversationDeleteMany).toHaveBeenCalledWith({
      _id: { $in: [] },
      ownerId: 'user-a',
    });
    expect(result.deletedConversationIds).toEqual([]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/chat/${conversationId}`,
    );
  });

  it('deletes a conversation when no sources remain', async () => {
    mocks.messageFind.mockReturnValue(
      queryResult([
        {
          _id: objectId(messageId),
          conversationId: objectId(conversationId),
          sources: [
            {
              number: 1,
              documentId: objectId(documentId),
              fileName: 'deleted.pdf',
              pageNumber: 1,
              score: 0.9,
            },
          ],
        },
      ]),
    );
    mocks.messageDistinct.mockResolvedValue([]);

    const response = await DELETE(
      new Request('http://localhost'),
      routeContext(),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.messageDeleteMany).toHaveBeenCalledWith({
      conversationId: { $in: [conversationId] },
    });
    expect(mocks.conversationDeleteMany).toHaveBeenCalledWith({
      _id: { $in: [conversationId] },
      ownerId: 'user-a',
    });
    expect(result.deletedConversationIds).toEqual([conversationId]);
  });
});
