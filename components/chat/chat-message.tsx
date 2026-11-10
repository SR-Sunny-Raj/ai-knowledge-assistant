'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, FileText, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../../types/chat';
import { groupChatSources } from '../../lib/group-chat-sources';

type ChatMessageProps = Readonly<{
  message: ChatMessageType;
}>;

export function ChatMessage({ message }: ChatMessageProps) {
  const pathname = usePathname();
  const isUser = message.role === 'user';
  const sourceGroups = groupChatSources(message.sources ?? []);

  return (
    <article
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
          <Bot size={17} />
        </span>
      )}

      <div className="max-w-[85%] sm:max-w-[75%]">
        <div
          className={`rounded-lg px-4 py-3 text-sm leading-6 ${
            isUser
              ? 'bg-primary text-white'
              : 'bg-surface-muted text-foreground'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1 pl-5">
                    {children}
                  </ol>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {sourceGroups.flatMap((group) => {
              const citations = group.visibleSources.map((source) => {
                const searchParams = new URLSearchParams({
                  returnTo: pathname,
                });

                if (source.pageNumber) {
                  searchParams.set('page', source.pageNumber.toString());
                }

                return (
                  <Link
                    key={`${source.number}-${source.documentId}`}
                    href={`/documents/${source.documentId}?${searchParams.toString()}`}
                    className="flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-foreground"
                  >
                    <FileText size={13} className="shrink-0 text-primary" />
                    <span className="truncate">
                      [{source.number}] {source.fileName}
                      {source.pageNumber ? ` · Page ${source.pageNumber}` : ''}
                    </span>
                  </Link>
                );
              });

              if (group.hiddenSourceCount > 0) {
                const searchParams = new URLSearchParams({
                  returnTo: pathname,
                });

                citations.push(
                  <Link
                    key={`full-${group.documentId}`}
                    href={`/documents/${group.documentId}?${searchParams.toString()}`}
                    title={`Open the full ${group.fileName}`}
                    className="flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-foreground"
                  >
                    <FileText size={13} className="shrink-0 text-primary" />
                    <span className="truncate">
                      [PDF] {group.fileName} · View full file (+
                      {group.hiddenSourceCount})
                    </span>
                  </Link>,
                );
              }

              return citations;
            })}
          </div>
        )}
      </div>

      {isUser && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-white">
          <User size={17} />
        </span>
      )}
    </article>
  );
}
