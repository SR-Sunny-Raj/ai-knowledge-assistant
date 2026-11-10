'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, Bot, LoaderCircle, SquarePen } from 'lucide-react';
import { ChatComposer } from './chat-composer';
import { ChatMessage } from './chat-message';
import { useChat } from './use-chat';
import type { ChatMessage as ChatMessageType } from '../../types/chat';

type ChatInterfaceProps = Readonly<{
  initialConversationId?: string | null;
  initialMessages?: ChatMessageType[];
  title?: string;
}>;

const suggestions = [
  'Summarize my uploaded documents.',
  'What are the most important points?',
  'Which documents discuss similar topics?',
];

export function ChatInterface({
  initialConversationId = null,
  initialMessages = [],
  title = 'Knowledge assistant',
}: ChatInterfaceProps) {
  const {
    messages,
    input,
    error,
    isSubmitting,
    setInput,
    sendMessage,
    startNewChat,
  } = useChat({
    initialConversationId,
    initialMessages,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, isSubmitting]);

  return (
    <section className="mx-auto flex h-[calc(100dvh-7rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-surface lg:h-[calc(100dvh-8rem)]">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            Answers are grounded in your uploaded documents
          </p>
        </div>

        <button
          type="button"
          onClick={startNewChat}
          disabled={messages.length === 0 || isSubmitting}
          aria-label="Start new chat"
          title="Start new chat"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SquarePen size={17} />
        </button>
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center text-center">
            <span className="flex size-12 items-center justify-center rounded-lg bg-surface-muted text-primary">
              <Bot size={23} />
            </span>

            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Ask your documents
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Ask a specific question and receive an answer with document and
              page citations.
            </p>

            <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-lg border border-border bg-background px-3 py-3 text-left text-sm text-muted transition-colors hover:border-primary hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        )}

        {isSubmitting && (
          <article
            aria-label="Assistant is preparing a response"
            className="mt-6 flex items-center gap-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
              <Bot size={17} />
            </span>

            <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
              <LoaderCircle className="animate-spin" size={16} />
              Searching documents and preparing an answer
            </div>
          </article>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatComposer
        value={input}
        isSubmitting={isSubmitting}
        onChange={setInput}
        onSubmit={sendMessage}
      />
    </section>
  );
}
