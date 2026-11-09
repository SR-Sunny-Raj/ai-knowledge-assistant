import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/session';
import { ConversationModel } from '../../../../models/conversation';
import { ConversationMessageModel } from '../../../../models/conversation-message';
import { DocumentModel } from '../../../../models/document';

type ConversationRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: 'Authentication required.',
    },
    { status: 401 },
  );
}

export async function GET(
  _request: Request,
  context: ConversationRouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid conversation ID.',
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const conversation = await ConversationModel.findOne({
      _id: id,
      ownerId: user.id,
    })
      .select('title createdAt updatedAt')
      .lean();

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation not found.',
        },
        { status: 404 },
      );
    }

    const messages = await ConversationMessageModel.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .select('role content sources createdAt')
      .lean();
    const sourceDocumentIds = messages.flatMap((message) =>
      message.sources.map((source) => source.documentId),
    );
    const existingSourceDocuments = await DocumentModel.find({
      _id: {
        $in: sourceDocumentIds,
      },
      ownerId: user.id,
    })
      .select('_id')
      .lean();
    const existingSourceDocumentIds = new Set(
      existingSourceDocuments.map((document) => String(document._id)),
    );

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation._id.toString(),
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      messages: messages.map((message) => ({
        id: message._id.toString(),
        role: message.role,
        content: message.content,
        sources: message.sources
          .filter((source) =>
            existingSourceDocumentIds.has(source.documentId.toString()),
          )
          .map((source) => ({
            number: source.number,
            documentId: source.documentId.toString(),
            fileName: source.fileName,
            pageNumber: source.pageNumber ?? null,
            score: source.score,
          })),
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Conversation loading failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load the conversation.',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: ConversationRouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid conversation ID.',
        },
        { status: 400 },
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

    const parsedBody = renameConversationSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a title between 1 and 120 characters.',
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const conversation = await ConversationModel.findOneAndUpdate(
      {
        _id: id,
        ownerId: user.id,
      },
      {
        $set: {
          title: parsedBody.data.title,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .select('title createdAt updatedAt')
      .lean();

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation not found.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation._id.toString(),
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Conversation rename failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to rename the conversation.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: ConversationRouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid conversation ID.',
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const conversation = await ConversationModel.findOne({
      _id: id,
      ownerId: user.id,
    })
      .select('_id')
      .lean();

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation not found.',
        },
        { status: 404 },
      );
    }

    await ConversationMessageModel.deleteMany({
      conversationId: conversation._id,
    });

    await ConversationModel.deleteOne({
      _id: conversation._id,
      ownerId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    console.error('Conversation deletion failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to delete the conversation.',
      },
      { status: 500 },
    );
  }
}
