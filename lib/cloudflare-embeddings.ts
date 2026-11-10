import 'server-only';

const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_BATCH_SIZE = 100;
const DEFAULT_MODEL = '@cf/baai/bge-base-en-v1.5';
const MAX_ATTEMPTS = 3;

type CloudflareEmbeddingResult = {
  shape?: number[];
  data?: number[][];
};

type CloudflareResponse = {
  success?: boolean;
  result?: CloudflareEmbeddingResult;
  errors?: Array<{ message?: string }>;
};

class CloudflareEmbeddingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CloudflareEmbeddingError';
  }
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from .env.local`);
  }

  return value;
}

function getModel() {
  return process.env.CLOUDFLARE_EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

function getEndpoint() {
  const accountId = requireEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID');
  const modelPath = getModel().split('/').map(encodeURIComponent).join('/');

  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function embedBatch(texts: string[]) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(getEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireEnvironmentVariable('CLOUDFLARE_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts, pooling: 'cls' }),
    });
    const body = (await response.json().catch(() => null)) as
      | CloudflareResponse
      | null;

    if (response.ok && body?.success && body.result?.data) {
      const embeddings = body.result.data;

      if (
        embeddings.length !== texts.length ||
        embeddings.some((embedding) => embedding.length !== EMBEDDING_DIMENSIONS)
      ) {
        throw new Error('Cloudflare returned invalid embedding dimensions.');
      }

      return embeddings;
    }

    const message =
      body?.errors?.find((error) => error.message)?.message ??
      `Cloudflare embedding request failed with status ${response.status}.`;
    const isRetryable = response.status >= 500 && attempt < MAX_ATTEMPTS - 1;

    if (!isRetryable) {
      throw new CloudflareEmbeddingError(message, response.status);
    }

    await wait(1000 * 2 ** attempt);
  }

  throw new Error('Cloudflare embedding retry loop ended unexpectedly.');
}

export async function embedDocumentChunks(texts: string[]) {
  const embeddings: number[][] = [];

  for (let start = 0; start < texts.length; start += EMBEDDING_BATCH_SIZE) {
    embeddings.push(...(await embedBatch(texts.slice(start, start + EMBEDDING_BATCH_SIZE))));
  }

  return embeddings;
}

export async function embedQuery(query: string) {
  const [embedding] = await embedBatch([query]);

  return embedding;
}

export function isEmbeddingRateLimitError(error: unknown) {
  return error instanceof CloudflareEmbeddingError && error.status === 429;
}