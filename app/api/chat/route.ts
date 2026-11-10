import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateGroundedAnswer,
  type ConversationTurn,
} from '../../../lib/gemini';
import {
  retrieveDocumentPages,
  retrieveRelevantChunks,
} from '../../../lib/retrieve-context';
import { requestsWholeDocument } from '../../../lib/retrieval-scope';
import { connectToDatabase } from '../../../lib/db';
import { getCurrentUser } from '../../../lib/session';
import { ConversationModel } from '../../../models/conversation';
import { ConversationMessageModel } from '../../../models/conversation-message';

const HISTORY_MESSAGE_LIMIT = 8;
const RETRIEVAL_USER_MESSAGE_LIMIT = 2;

const chatRequestSchema = z.object({
  message: z.string().trim().min(2).max(1000),
  conversationId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
});

function createConversationTitle(question: string) {
  const maximumLength = 60;

  if (question.length <= maximumLength) {
    return question;
  }

  return `${question.slice(0, maximumLength - 3).trimEnd()}...`;
}

function buildRetrievalQuery(question: string, history: ConversationTurn[]) {
  const recentUserMessages = history
    .filter((message) => message.role === 'user')
    .slice(-RETRIEVAL_USER_MESSAGE_LIMIT)
    .map((message) => message.content);

  return [...recentUserMessages, question].join('\n');
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication required.',
      },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'A valid JSON body is required.',
      },
      { status: 400 },
    );
  }

  const parsedBody = chatRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Enter a message between 2 and 1000 characters.',
      },
      { status: 400 },
    );
  }

  try {
    const question = parsedBody.data.message;
    const requestedConversationId = parsedBody.data.conversationId;

    await connectToDatabase();

    let conversation = requestedConversationId
      ? await ConversationModel.findOne({
          _id: requestedConversationId,
          ownerId: user.id,
        })
      : null;

    if (requestedConversationId && !conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation not found.',
        },
        { status: 404 },
      );
    }

    const storedHistory = conversation
      ? await ConversationMessageModel.find({
          conversationId: conversation._id,
        })
          .sort({ createdAt: -1 })
          .limit(HISTORY_MESSAGE_LIMIT)
          .select('role content -_id')
          .lean()
      : [];

    const history: ConversationTurn[] = storedHistory
      .reverse()
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const retrievalQuery = buildRetrievalQuery(question, history);
    const relevantChunks = await retrieveRelevantChunks(
      user.id,
      retrievalQuery,
      5,
    );
    const topChunk = relevantChunks[0];
    const chunks =
      topChunk && requestsWholeDocument(question)
        ? await retrieveDocumentPages(
            user.id,
            topChunk.documentId,
            topChunk.score,
          )
        : relevantChunks;

    const answer =
      chunks.length === 0
        ? 'I could not find relevant information in the uploaded documents.'
        : await generateGroundedAnswer(question, chunks, history);

    const sources = chunks.map((chunk, index) => ({
      number: index + 1,
      documentId: chunk.documentId,
      fileName: chunk.fileName,
      pageNumber: chunk.pageNumber,
      score: chunk.score,
    }));

    if (!conversation) {
      conversation = await ConversationModel.create({
        ownerId: user.id,
        title: createConversationTitle(question),
      });
    }

    await ConversationMessageModel.insertMany([
      {
        conversationId: conversation._id,
        role: 'user',
        content: question,
        sources: [],
      },
      {
        conversationId: conversation._id,
        role: 'assistant',
        content: answer,
        sources,
      },
    ]);

    await ConversationModel.updateOne(
      {
        _id: conversation._id,
        ownerId: user.id,
      },
      {
        $set: {
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      conversationId: conversation._id.toString(),
      answer,
      sources,
    });
  } catch (error) {
    console.error('Chat request failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to answer the question.',
      },
      { status: 500 },
    );
  }
}
