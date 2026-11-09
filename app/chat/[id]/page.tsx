import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ChatInterface } from '../../../components/chat/chat-interface';
import { connectToDatabase } from '../../../lib/db';
import { requireCurrentUser } from '../../../lib/session';
import { ConversationModel } from '../../../models/conversation';
import { ConversationMessageModel } from '../../../models/conversation-message';
import { DocumentModel } from '../../../models/document';
import type { ChatMessage } from '../../../types/chat';

export const instant = false;

type SavedChatPageProps = Readonly<{
  params: Promise<{
    id: string;
  }>;
}>;

export default async function SavedChatPage({ params }: SavedChatPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  await connection();
  await connectToDatabase();

  const conversation = await ConversationModel.findOne({
    _id: id,
    ownerId: user.id,
  })
    .select('title')
    .lean();

  if (!conversation) {
    notFound();
  }

  const storedMessages = await ConversationMessageModel.find({
    conversationId: conversation._id,
  })
    .sort({ createdAt: 1 })
    .select('role content sources')
    .lean();
  const sourceDocumentIds = storedMessages.flatMap((message) =>
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

  const initialMessages: ChatMessage[] = storedMessages.map((message) => ({
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
  }));

  return (
    <ChatInterface
      key={conversation._id.toString()}
      initialConversationId={conversation._id.toString()}
      initialMessages={initialMessages}
      title={conversation.title}
    />
  );
}
