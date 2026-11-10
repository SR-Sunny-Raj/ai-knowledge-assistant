import type { ChatSource } from '../types/chat';

const MAX_PAGE_CITATIONS_PER_DOCUMENT = 3;

export type ChatSourceGroup = {
  documentId: string;
  fileName: string;
  visibleSources: ChatSource[];
  hiddenSourceCount: number;
};

export function groupChatSources(sources: ChatSource[]): ChatSourceGroup[] {
  const groups = new Map<string, ChatSourceGroup>();

  for (const source of sources) {
    const group = groups.get(source.documentId) ?? {
      documentId: source.documentId,
      fileName: source.fileName,
      visibleSources: [],
      hiddenSourceCount: 0,
    };

    if (group.visibleSources.length < MAX_PAGE_CITATIONS_PER_DOCUMENT) {
      group.visibleSources.push(source);
    } else {
      group.hiddenSourceCount += 1;
    }

    groups.set(source.documentId, group);
  }

  return [...groups.values()];
}
