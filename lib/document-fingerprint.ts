import 'server-only';

import { createHash } from 'node:crypto';

type FingerprintChunk = {
  content: string;
};

export function createDocumentFingerprint(chunks: FingerprintChunk[]) {
  const hash = createHash('sha256');

  for (const chunk of chunks) {
    hash.update(`${Buffer.byteLength(chunk.content, 'utf8')}:`);
    hash.update(chunk.content);
    hash.update(';');
  }

  return hash.digest('hex');
}
