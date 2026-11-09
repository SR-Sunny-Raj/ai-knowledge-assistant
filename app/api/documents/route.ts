import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { DocumentModel } from '../../../models/document';
import { chunkPages } from '../../../lib/chunk-text';
import { parsePdf } from '../../../lib/parse-pdf';
import { DocumentChunkModel } from '../../../models/document-chunk';
import { getCurrentUser } from '../../../lib/session';
import {
  embedDocumentChunks,
  isGeminiRateLimitError,
} from '../../../lib/gemini';

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

    await connectToDatabase();

    const document = await DocumentModel.create({
      ownerId: user.id,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      status: 'processing',
    });

    try {
      const parsedPdf = await parsePdf(data);
      const chunks = chunkPages(parsedPdf.pages);

      if (chunks.length === 0) {
        throw new Error('The PDF does not contain extractable text.');
      }

      const embeddings = await embedDocumentChunks(
        chunks.map((chunk) => chunk.content),
        file.name,
      );

      await DocumentChunkModel.insertMany(
        chunks.map((chunk, index) => ({
          ownerId: user.id,
          documentId: document._id,
          ...chunk,
          embedding: embeddings[index],
        })),
      );

      document.pageCount = parsedPdf.pageCount;
      document.status = 'ready';
      document.errorMessage = null;

      await document.save();

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
    } catch (processingError) {
      console.error('PDF processing failed:', processingError);

      const isRateLimited = isGeminiRateLimitError(processingError);

      await DocumentChunkModel.deleteMany({
        ownerId: user.id,
        documentId: document._id,
      }).catch((cleanupError) => {
        console.error('Chunk cleanup failed:', cleanupError);
      });

      document.status = 'failed';
      document.errorMessage = isRateLimited
        ? 'Gemini embedding quota was temporarily exhausted.'
        : processingError instanceof Error
          ? processingError.message
          : 'Unknown processing error';

      await document.save();

      return NextResponse.json(
        {
          success: false,
          message: isRateLimited
            ? 'The embedding service is temporarily rate-limited. Please retry shortly.'
            : 'The PDF could not be processed.',
        },
        { status: isRateLimited ? 429 : 422 },
      );
    }
  } catch (error) {
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
