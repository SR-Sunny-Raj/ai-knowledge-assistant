import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from 'mongoose';

const documentChunkSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    pageNumber: {
      type: Number,
      default: null,
      min: 1,
    },
    embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
documentChunkSchema.index({
  ownerId: 1,
  documentId: 1,
  pageNumber: 1,
  chunkIndex: 1,
});

export type DocumentChunk = InferSchemaType<typeof documentChunkSchema>;

const existingDocumentChunkModel = models.DocumentChunk as
  | Model<DocumentChunk>
  | undefined;

export const DocumentChunkModel: Model<DocumentChunk> =
  existingDocumentChunkModel ??
  model<DocumentChunk>('DocumentChunk', documentChunkSchema);
