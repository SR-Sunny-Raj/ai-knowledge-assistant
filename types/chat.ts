export type ChatSource = {
  number: number;
  documentId: string;
  fileName: string;
  pageNumber: number | null;
  score: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type SuccessfulChatResponse = {
  success: true;
  conversationId: string;
  answer: string;
  sources: ChatSource[];
};

type FailedChatResponse = {
  success: false;
  message: string;
};

export type ChatResponse = SuccessfulChatResponse | FailedChatResponse;

type SuccessfulConversationListResponse = {
  success: true;
  conversations: ConversationSummary[];
};

export type ConversationListResponse =
  | SuccessfulConversationListResponse
  | FailedChatResponse;
