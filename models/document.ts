import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from 'mongoose';

const documentSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf'],
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    contentHash: {
      type: String,
      minlength: 64,
      maxlength: 64,
      select: false,
    },
    pageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

documentSchema.index({ ownerId: 1, createdAt: -1 });
documentSchema.index(
  { ownerId: 1, contentHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      contentHash: { $type: 'string' },
    },
  },
);

export type KnowledgeDocument = InferSchemaType<typeof documentSchema>;

const existingDocumentModel = models.Document as
  | Model<KnowledgeDocument>
  | undefined;

export const DocumentModel: Model<KnowledgeDocument> =
  existingDocumentModel ?? model<KnowledgeDocument>('Document', documentSchema);
