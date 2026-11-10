import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { DocumentModel } from '../../../models/document';
import { chunkPages } from '../../../lib/chunk-text';
import { DocumentChunkModel } from '../../../models/document-chunk';
import { getCurrentUser } from '../../../lib/session';
import { createDocumentFingerprint } from '../../../lib/document-fingerprint';
import {
  embedDocumentChunks,
  isEmbeddingRateLimitError,
} from '../../../lib/cloudflare-embeddings';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: 'Authentication required.',
    },
    { status: 401 },
  );
}

async function parsePdfIntoChunks(data: Uint8Array) {
  const { parsePdf } = await import('../../../lib/parse-pdf');
  const parsedPdf = await parsePdf(data);
  const chunks = chunkPages(parsedPdf.pages);

  if (chunks.length === 0) {
    throw new Error('The PDF does not contain extractable text.');
  }

  return { parsedPdf, chunks };
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();

    const documentRecords = await DocumentModel.find({
      ownerId: user.id,
    })
      .sort({ createdAt: -1 })
      .select(
        'fileName mimeType fileSize pageCount status errorMessage createdAt updatedAt',
      )
      .lean();

    const documents = documentRecords.map(({ _id, ...document }) => ({
      id: _id.toString(),
      ...document,
    }));

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Failed to retrieve documents:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to retrieve documents.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: 'A PDF file is required.',
        },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'The selected file is empty.',
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'The PDF must be smaller than 4 MB.',
        },
        { status: 400 },
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          message: 'Only PDF files are supported.',
        },
        { status: 400 },
      );
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder().decode(data.subarray(0, 5));

    if (signature !== '%PDF-') {
      return NextResponse.json(
        {
          success: false,
          message: 'The uploaded file is not a valid PDF.',
        },
        { status: 400 },
      );
    }

    let processedPdf: Awaited<ReturnType<typeof parsePdfIntoChunks>>;

    try {
      processedPdf = await parsePdfIntoChunks(data);
    } catch (processingError) {
      console.error('PDF processing failed:', processingError);

      return NextResponse.json(
        {
          success: false,
          message: 'The PDF could not be processed.',
        },
        { status: 422 },
      );
    }

    await connectToDatabase();
    const contentHash = createDocumentFingerprint(processedPdf.chunks);
    const existingDocument = await DocumentModel.exists({
      ownerId: user.id,
      contentHash,
    });

    if (existingDocument) {
      return NextResponse.json(
        {
          success: false,
          message: 'This PDF has already been uploaded.',
        },
        { status: 409 },
      );
    }

    let embeddings: number[][];

    try {
      embeddings = await embedDocumentChunks(
        processedPdf.chunks.map((chunk) => chunk.content),
      );
    } catch (embeddingError) {
      console.error('PDF embedding failed:', embeddingError);

      const isRateLimited = isEmbeddingRateLimitError(embeddingError);

      return NextResponse.json(
        {
          success: false,
          message: isRateLimited
            ? 'The embedding service has reached its daily limit. Please retry later.'
            : 'The PDF could not be processed.',
        },
        { status: isRateLimited ? 429 : 422 },
      );
    }

    const document = await DocumentModel.create({
      ownerId: user.id,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      contentHash,
      pageCount: processedPdf.parsedPdf.pageCount,
      status: 'ready',
      errorMessage: null,
    });

    try {
      await DocumentChunkModel.insertMany(
        processedPdf.chunks.map((chunk, index) => ({
          ownerId: user.id,
          documentId: document._id,
          ...chunk,
          embedding: embeddings[index],
        })),
      );
    } catch (storageError) {
      await Promise.allSettled([
        DocumentChunkModel.deleteMany({
          ownerId: user.id,
          documentId: document._id,
        }),
        DocumentModel.deleteOne({
          _id: document._id,
          ownerId: user.id,
        }),
      ]);

      throw storageError;
    }

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document._id.toString(),
          fileName: document.fileName,
          fileSize: document.fileSize,
          pageCount: document.pageCount,
          status: document.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: 'This PDF has already been uploaded.',
        },
        { status: 409 },
      );
    }

    console.error('Document upload failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to upload the document.',
      },
      { status: 500 },
    );
  }
}
