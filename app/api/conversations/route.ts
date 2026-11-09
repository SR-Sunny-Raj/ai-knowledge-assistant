import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { getCurrentUser } from '../../../lib/session';
import { ConversationModel } from '../../../models/conversation';

export async function GET() {
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

  try {
    await connectToDatabase();

    const conversations = await ConversationModel.find({
      ownerId: user.id,
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .select('title createdAt updatedAt')
      .lean();

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conversation) => ({
        id: conversation._id.toString(),
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Conversation listing failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load conversations.',
      },
      { status: 500 },
    );
  }
}
