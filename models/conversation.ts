import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from 'mongoose';

const conversationSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: 'New conversation',
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ ownerId: 1, updatedAt: -1 });

export type Conversation = InferSchemaType<typeof conversationSchema>;

const existingConversationModel = models.Conversation as
  | Model<Conversation>
  | undefined;

export const ConversationModel: Model<Conversation> =
  existingConversationModel ??
  model<Conversation>('Conversation', conversationSchema);
