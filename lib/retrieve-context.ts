import 'server-only';

import { Types } from 'mongoose';
import { connectToDatabase } from './db';
import { embedQuery } from './cloudflare-embeddings';
import { DocumentChunkModel } from '../models/document-chunk';

const DEFAULT_MINIMUM_SCORE = 0.7;
const CANDIDATE_MULTIPLIER = 3;
const INITIAL_CHUNKS_PER_DOCUMENT = 2;

export type RetrievedChunk = {
  content: string;
  pageNumber: number | null;
  score: number;
  documentId: string;
  fileName: string;
};

type StoredDocumentChunk = {
  content: string;
  pageNumber: number | null;
  documentId: string;
  fileName: string;
};

function getMinimumScore() {
  const configuredScore = Number(
    process.env.MIN_RETRIEVAL_SCORE ?? DEFAULT_MINIMUM_SCORE,
  );

  return Number.isFinite(configuredScore) &&
    configuredScore >= 0 &&
    configuredScore <= 1
    ? configuredScore
    : DEFAULT_MINIMUM_SCORE;
}

function selectDiverseChunks(candidates: RetrievedChunk[], limit: number) {
  const uniqueCandidates: RetrievedChunk[] = [];
  const seenPages = new Set<string>();

  for (const candidate of candidates) {
    const pageKey = `${candidate.documentId}:${candidate.pageNumber ?? 'unknown'}`;

    if (!seenPages.has(pageKey)) {
      seenPages.add(pageKey);
      uniqueCandidates.push(candidate);
    }
  }

  const selected: RetrievedChunk[] = [];
  const deferred: RetrievedChunk[] = [];
  const documentCounts = new Map<string, number>();

  for (const candidate of uniqueCandidates) {
    const count = documentCounts.get(candidate.documentId) ?? 0;

    if (count < INITIAL_CHUNKS_PER_DOCUMENT) {
      selected.push(candidate);
      documentCounts.set(candidate.documentId, count + 1);
    } else {
      deferred.push(candidate);
    }

    if (selected.length === limit) {
      return selected;
    }
  }

  return [...selected, ...deferred].slice(0, limit);
}

export async function retrieveRelevantChunks(
  ownerId: string,
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> {
  const normalizedQuery = query.trim();

  if (!ownerId) {
    throw new Error('An owner ID is required for retrieval.');
  }

  if (!normalizedQuery) {
    throw new Error('A search query is required.');
  }

  const resultLimit = Math.min(Math.max(limit, 1), 10);
  const candidateLimit = resultLimit * CANDIDATE_MULTIPLIER;
  const queryVector = await embedQuery(normalizedQuery);

  await connectToDatabase();

  const candidates = await DocumentChunkModel.aggregate<RetrievedChunk>([
    {
      $vectorSearch: {
        index: 'document_embedding_index',
        path: 'embedding',
        queryVector,
        filter: {
          ownerId,
        },
        numCandidates: candidateLimit * 20,
        limit: candidateLimit,
      },
    },
    {
      $lookup: {
        from: 'documents',
        let: {
          matchedDocumentId: '$documentId',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$matchedDocumentId'],
                  },
                  {
                    $eq: ['$ownerId', ownerId],
                  },
                ],
              },
            },
          },
        ],
        as: 'document',
      },
    },
    {
      $unwind: '$document',
    },
    {
      $project: {
        _id: 0,
        content: 1,
        pageNumber: 1,
        score: {
          $meta: 'vectorSearchScore',
        },
        documentId: {
          $toString: '$documentId',
        },
        fileName: '$document.fileName',
      },
    },
    {
      $match: {
        score: {
          $gte: getMinimumScore(),
        },
      },
    },
  ]);

  return selectDiverseChunks(candidates, resultLimit);
}

export async function retrieveDocumentPages(
  ownerId: string,
  documentId: string,
  relevanceScore: number,
): Promise<RetrievedChunk[]> {
  if (!ownerId || !Types.ObjectId.isValid(documentId)) {
    throw new Error('A valid owned document is required for retrieval.');
  }

  await connectToDatabase();

  const chunks = await DocumentChunkModel.aggregate<StoredDocumentChunk>([
    {
      $match: {
        ownerId,
        documentId: new Types.ObjectId(documentId),
      },
    },
    {
      $lookup: {
        from: 'documents',
        let: {
          matchedDocumentId: '$documentId',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$matchedDocumentId'],
                  },
                  {
                    $eq: ['$ownerId', ownerId],
                  },
                ],
              },
            },
          },
        ],
        as: 'document',
      },
    },
    {
      $unwind: '$document',
    },
    {
      $sort: {
        pageNumber: 1,
        chunkIndex: 1,
      },
    },
    {
      $project: {
        _id: 0,
        content: 1,
        pageNumber: 1,
        documentId: {
          $toString: '$documentId',
        },
        fileName: '$document.fileName',
      },
    },
  ]);

  const pages = new Map<number | null, RetrievedChunk>();

  for (const chunk of chunks) {
    const existingPage = pages.get(chunk.pageNumber);

    if (existingPage) {
      existingPage.content += `\n${chunk.content}`;
      continue;
    }

    pages.set(chunk.pageNumber, {
      ...chunk,
      score: relevanceScore,
    });
  }

  return [...pages.values()];
}
