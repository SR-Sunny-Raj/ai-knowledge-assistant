import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  getCurrentUser: vi.fn(),
  conversationFindOne: vi.fn(),
  messageFind: vi.fn(),
  documentFind: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock('@/lib/session', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/models/conversation', () => ({
  ConversationModel: {
    findOne: mocks.conversationFindOne,
  },
}));

vi.mock('@/models/conversation-message', () => ({
  ConversationMessageModel: {
    find: mocks.messageFind,
  },
}));

vi.mock('@/models/document', () => ({
  DocumentModel: {
    find: mocks.documentFind,
  },
}));

import { GET } from '@/app/api/conversations/[id]/route';

const conversationId = '507f1f77bcf86cd799439021';
const messageId = '507f1f77bcf86cd799439031';
const validDocumentId = '507f1f77bcf86cd799439041';
const deletedDocumentId = '507f1f77bcf86cd799439042';

function objectId(value: string) {
  return {
    toString: () => value,
  };
}

function selectedResult<T>(value: T) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(value),
    }),
  };
}

function sortedResult<T>(value: T) {
  return {
    sort: vi.fn().mockReturnValue(selectedResult(value)),
  };
}

function routeContext() {
  return {
    params: Promise.resolve({ id: conversationId }),
  };
}

describe('GET /api/conversations/[id]', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-a',
      name: 'User A',
      email: 'user-a@example.com',
      image: null,
    });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.conversationFindOne.mockReturnValue(
      selectedResult({
        _id: objectId(conversationId),
        title: 'Test conversation',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    );
    mocks.messageFind.mockReturnValue(sortedResult([]));
    mocks.documentFind.mockReturnValue(selectedResult([]));
  });

  it('returns 401 before accessing the database when signed out', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost'), routeContext());

    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it('returns 404 for another user conversation', async () => {
    mocks.conversationFindOne.mockReturnValue(selectedResult(null));

    const response = await GET(new Request('http://localhost'), routeContext());

    expect(response.status).toBe(404);
    expect(mocks.conversationFindOne).toHaveBeenCalledWith({
      _id: conversationId,
      ownerId: 'user-a',
    });
    expect(mocks.messageFind).not.toHaveBeenCalled();
  });

  it('omits missing documents while preserving valid sources', async () => {
    const validSource = {
      number: 1,
      documentId: objectId(validDocumentId),
      fileName: 'valid.pdf',
      pageNumber: 2,
      score: 0.9,
    };
    const deletedSource = {
      number: 2,
      documentId: objectId(deletedDocumentId),
      fileName: 'deleted.pdf',
      pageNumber: 3,
      score: 0.8,
    };

    mocks.messageFind.mockReturnValue(
      sortedResult([
        {
          _id: objectId(messageId),
          role: 'assistant',
          content: 'Grounded answer',
          sources: [validSource, deletedSource],
          createdAt: new Date('2026-01-01T00:01:00.000Z'),
        },
      ]),
    );
    mocks.documentFind.mockReturnValue(
      selectedResult([{ _id: objectId(validDocumentId) }]),
    );

    const response = await GET(new Request('http://localhost'), routeContext());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messages[0].sources).toEqual([
      {
        number: 1,
        documentId: validDocumentId,
        fileName: 'valid.pdf',
        pageNumber: 2,
        score: 0.9,
      },
    ]);
    expect(mocks.documentFind).toHaveBeenCalledWith({
      _id: {
        $in: [validSource.documentId, deletedSource.documentId],
      },
      ownerId: 'user-a',
    });
  });
});
