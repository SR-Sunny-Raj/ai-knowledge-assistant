import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  embedDocumentChunks,
  embedQuery,
  isEmbeddingRateLimitError,
} from '@/lib/cloudflare-embeddings';

const embedding = Array.from({ length: 768 }, () => 0.1);

function cloudflareResponse(data: number[][], status = 200) {
  return new Response(
    JSON.stringify({
      success: status >= 200 && status < 300,
      result: { data },
      errors: status === 429 ? [{ message: 'Daily limit reached.' }] : [],
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

describe('Cloudflare embeddings', () => {
  beforeEach(() => {
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'account-id');
    vi.stubEnv('CLOUDFLARE_API_TOKEN', 'api-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('batches document chunks in groups of 100', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { text: string[] };

      return cloudflareResponse(request.text.map(() => embedding));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await embedDocumentChunks(
      Array.from({ length: 101 }, (_, index) => `Chunk ${index}`),
    );

    expect(result).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects vectors with unexpected dimensions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => cloudflareResponse([[0.1, 0.2]])),
    );

    await expect(embedQuery('question')).rejects.toThrow(
      'invalid embedding dimensions',
    );
  });

  it('classifies a daily limit without retrying', async () => {
    const fetchMock = vi.fn(async () => cloudflareResponse([], 429));
    vi.stubGlobal('fetch', fetchMock);

    const error = await embedQuery('question').catch((caught) => caught);

    expect(isEmbeddingRateLimitError(error)).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});