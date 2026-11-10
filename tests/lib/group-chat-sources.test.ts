import { describe, expect, it } from 'vitest';
import { groupChatSources } from '@/lib/group-chat-sources';
import type { ChatSource } from '@/types/chat';

function source(
  number: number,
  documentId: string,
  fileName: string,
): ChatSource {
  return {
    number,
    documentId,
    fileName,
    pageNumber: number,
    score: 0.9,
  };
}

describe('groupChatSources', () => {
  it('shows at most three page citations and counts the remainder per PDF', () => {
    const groups = groupChatSources([
      source(1, 'document-a', 'a.pdf'),
      source(2, 'document-a', 'a.pdf'),
      source(3, 'document-a', 'a.pdf'),
      source(4, 'document-a', 'a.pdf'),
      source(5, 'document-a', 'a.pdf'),
    ]);

    expect(groups).toEqual([
      {
        documentId: 'document-a',
        fileName: 'a.pdf',
        visibleSources: [
          source(1, 'document-a', 'a.pdf'),
          source(2, 'document-a', 'a.pdf'),
          source(3, 'document-a', 'a.pdf'),
        ],
        hiddenSourceCount: 2,
      },
    ]);
  });

  it('applies the limit independently to each PDF', () => {
    const groups = groupChatSources([
      source(1, 'document-a', 'a.pdf'),
      source(2, 'document-b', 'b.pdf'),
      source(3, 'document-a', 'a.pdf'),
      source(4, 'document-b', 'b.pdf'),
      source(5, 'document-a', 'a.pdf'),
      source(6, 'document-b', 'b.pdf'),
      source(7, 'document-a', 'a.pdf'),
      source(8, 'document-b', 'b.pdf'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].visibleSources).toHaveLength(3);
    expect(groups[0].hiddenSourceCount).toBe(1);
    expect(groups[1].visibleSources).toHaveLength(3);
    expect(groups[1].hiddenSourceCount).toBe(1);
  });
});
