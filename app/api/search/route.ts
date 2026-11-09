import { NextResponse } from 'next/server';
import { z } from 'zod';
import { retrieveRelevantChunks } from '../../../lib/retrieve-context';
import { getCurrentUser } from '../../../lib/session';

const searchRequestSchema = z.object({
  query: z.string().trim().min(2).max(500),
  limit: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'A valid JSON body is required.',
      },
      { status: 400 },
    );
  }

  const parsedBody = searchRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Enter a query between 2 and 500 characters.',
      },
      { status: 400 },
    );
  }

  try {
    const chunks = await retrieveRelevantChunks(
      user.id,
      parsedBody.data.query,
      parsedBody.data.limit,
    );

    return NextResponse.json({
      success: true,
      chunks,
    });
  } catch (error) {
    console.error('Semantic search failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to search the knowledge base.',
      },
      { status: 500 },
    );
  }
}
