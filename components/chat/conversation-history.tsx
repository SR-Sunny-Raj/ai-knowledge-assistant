'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquareText, Search } from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import { DeleteConversationButton } from './delete-conversation-button';
import { RenameConversationButton } from './rename-conversation-button';
import type {
  ConversationListResponse,
  ConversationSummary,
} from '../../types/chat';

type ConversationHistoryProps = Readonly<{
  onNavigate?: () => void;
}>;

export function ConversationHistory({ onNavigate }: ConversationHistoryProps) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredConversations = normalizedQuery
    ? conversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(normalizedQuery),
      )
    : conversations;

  function handleConversationRenamed(updatedConversation: ConversationSummary) {
    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    );
  }

  function handleConversationDeleted(conversationId: string) {
    setConversations((currentConversations) =>
      currentConversations.filter(
        (conversation) => conversation.id !== conversationId,
      ),
    );

    if (pathname === `/chat/${conversationId}`) {
      onNavigate?.();
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadConversations() {
      try {
        const response = await fetch('/api/conversations', {
          signal: controller.signal,
        });
        const result = (await response.json()) as ConversationListResponse;

        if (!response.ok || !result.success) {
          return;
        }

        setConversations(result.conversations);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Conversation history loading failed:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadConversations();

    return () => {
      controller.abort();
    };
  }, [pathname]);

  useEffect(() => {
    function handleConversationsDeleted(event: Event) {
      const deletedConversationIds = new Set(
        (event as CustomEvent<string[]>).detail,
      );

      setConversations((currentConversations) =>
        currentConversations.filter(
          (conversation) => !deletedConversationIds.has(conversation.id),
        ),
      );
    }

    window.addEventListener(
      'conversations-deleted',
      handleConversationsDeleted,
    );

    return () => {
      window.removeEventListener(
        'conversations-deleted',
        handleConversationsDeleted,
      );
    };
  }, []);

  return (
    <section className="mt-6 flex min-h-0 flex-1 flex-col">
      <h2 className="px-3 text-xs font-semibold uppercase text-muted">
        Recent chats
      </h2>

      <label className="relative mt-3 block">
        <span className="sr-only">Search conversations</span>
        <Search
          aria-hidden="true"
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats"
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <nav
        aria-label="Recent conversations"
        className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto"
      >
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-9 animate-pulse rounded-md bg-surface-muted"
              />
            ))
          : filteredConversations.map((conversation) => {
              const href = `/chat/${conversation.id}`;
              const isActive = pathname === href;

              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-1 rounded-md ${
                    isActive ? 'bg-surface-muted' : 'hover:bg-surface-muted'
                  }`}
                >
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    title={conversation.title}
                    className={`flex h-9 min-w-0 flex-1 items-center gap-2 px-3 text-sm transition-colors ${
                      isActive
                        ? 'text-foreground'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <MessageSquareText size={15} className="shrink-0" />
                    <span className="truncate">{conversation.title}</span>
                  </Link>

                  <RenameConversationButton
                    conversation={conversation}
                    isActive={isActive}
                    onRenamed={handleConversationRenamed}
                  />

                  <DeleteConversationButton
                    conversationId={conversation.id}
                    conversationTitle={conversation.title}
                    isActive={isActive}
                    onDeleted={handleConversationDeleted}
                  />
                </div>
              );
            })}

        {!isLoading && filteredConversations.length === 0 && (
          <p className="px-3 py-4 text-sm leading-5 text-muted">
            {conversations.length === 0
              ? 'No conversations yet.'
              : 'No matching conversations.'}
          </p>
        )}
      </nav>
    </section>
  );
}
