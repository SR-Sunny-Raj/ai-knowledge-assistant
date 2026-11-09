import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from 'mongoose';

const messageSourceSchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    pageNumber: {
      type: Number,
      default: null,
      min: 1,
    },
    score: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const conversationMessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20_000,
    },
    sources: {
      type: [messageSourceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

conversationMessageSchema.index({
  conversationId: 1,
  createdAt: 1,
});

export type ConversationMessage = InferSchemaType<
  typeof conversationMessageSchema
>;

const existingConversationMessageModel = models.ConversationMessage as
  | Model<ConversationMessage>
  | undefined;

export const ConversationMessageModel: Model<ConversationMessage> =
  existingConversationMessageModel ??
  model<ConversationMessage>('ConversationMessage', conversationMessageSchema);
