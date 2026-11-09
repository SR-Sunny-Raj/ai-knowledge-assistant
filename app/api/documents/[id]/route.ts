import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/db';
import { ConversationMessageModel } from '../../../../models/conversation-message';
import { ConversationModel } from '../../../../models/conversation';
import { DocumentChunkModel } from '../../../../models/document-chunk';
import { DocumentModel } from '../../../../models/document';
import { getCurrentUser } from '../../../../lib/session';

type DocumentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: DocumentRouteContext) {
  try {
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
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid document ID.',
        },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const document = await DocumentModel.findOne({
      _id: id,
      ownerId: user.id,
    })
      .select('_id')
      .lean();

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          message: 'Document not found.',
        },
        { status: 404 },
      );
    }

    const ownedConversationIds = (
      await ConversationModel.find({
        ownerId: user.id,
      })
        .select('_id')
        .lean()
    ).map((conversation) => String(conversation._id));
    const affectedMessages = await ConversationMessageModel.find({
      conversationId: {
        $in: ownedConversationIds,
      },
      'sources.documentId': document._id,
    })
      .select('conversationId sources')
      .lean();
    const affectedConversationIds = [
      ...new Set(
        affectedMessages.map((message) => String(message.conversationId)),
      ),
    ];
    let deletedConversationIds: string[] = [];

    if (affectedConversationIds.length > 0) {
      await Promise.all(
        affectedMessages.map((message) =>
          ConversationMessageModel.updateOne(
            {
              _id: message._id,
            },
            {
              $set: {
                sources: message.sources.filter(
                  (source) => source.documentId.toString() !== id,
                ),
              },
            },
          ),
        ),
      );

      const conversationsWithRemainingSources = new Set(
        (
          await ConversationMessageModel.distinct('conversationId', {
            conversationId: {
              $in: affectedConversationIds,
            },
            'sources.0': {
              $exists: true,
            },
          })
        ).map((conversationId) => String(conversationId)),
      );
      deletedConversationIds = affectedConversationIds.filter(
        (conversationId) =>
          !conversationsWithRemainingSources.has(conversationId),
      );

      await ConversationMessageModel.deleteMany({
        conversationId: {
          $in: deletedConversationIds,
        },
      });

      await ConversationModel.deleteMany({
        _id: {
          $in: deletedConversationIds,
        },
        ownerId: user.id,
      });
    }

    await DocumentChunkModel.deleteMany({
      ownerId: user.id,
      documentId: document._id,
    });

    await DocumentModel.deleteOne({
      _id: document._id,
      ownerId: user.id,
    });

    for (const conversationId of affectedConversationIds) {
      revalidatePath(`/chat/${conversationId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Document and related citations deleted successfully.',
      deletedConversationIds,
    });
  } catch (error) {
    console.error('Document deletion failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to delete the document.',
      },
      { status: 500 },
    );
  }
}
