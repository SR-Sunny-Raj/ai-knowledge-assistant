import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createDocumentFingerprint } from '@/lib/document-fingerprint';

describe('createDocumentFingerprint', () => {
  it('returns the same fingerprint for identical extracted content', () => {
    const chunks = [{ content: 'Page one' }, { content: 'Page two' }];

    expect(createDocumentFingerprint(chunks)).toBe(
      createDocumentFingerprint(chunks.map((chunk) => ({ ...chunk }))),
    );
  });

  it('distinguishes content and chunk boundaries', () => {
    expect(
      createDocumentFingerprint([{ content: 'ab' }, { content: 'c' }]),
    ).not.toBe(
      createDocumentFingerprint([{ content: 'a' }, { content: 'bc' }]),
    );
  });
});
