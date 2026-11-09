export type SourcePage = {
  num: number;
  text: string;
};

export type TextChunk = {
  content: string;
  pageNumber: number;
  chunkIndex: number;
};

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 200;

export function chunkPages(
  pages: SourcePage[],
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): TextChunk[] {
  if (chunkSize <= 0 || overlap < 0 || overlap >= chunkSize) {
    throw new Error('Invalid chunk size or overlap.');
  }

  const chunks: TextChunk[] = [];

  for (const page of pages) {
    const normalizedText = page.text.replace(/\s+/g, ' ').trim();

    if (!normalizedText) {
      continue;
    }

    let start = 0;

    while (start < normalizedText.length) {
      let end = Math.min(start + chunkSize, normalizedText.length);

      if (end < normalizedText.length) {
        const wordBoundary = normalizedText.lastIndexOf(' ', end);
        const minimumBoundary = start + chunkSize * 0.6;

        if (wordBoundary >= minimumBoundary) {
          end = wordBoundary;
        }
      }

      const content = normalizedText.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          pageNumber: page.num,
          chunkIndex: chunks.length,
        });
      }

      if (end === normalizedText.length) {
        break;
      }

      start = end - overlap;
    }
  }

  return chunks;
}
