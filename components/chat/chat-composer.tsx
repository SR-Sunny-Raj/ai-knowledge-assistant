'use client';

import { type KeyboardEvent, type SubmitEvent, useRef } from 'react';
import { LoaderCircle, Send } from 'lucide-react';

type ChatComposerProps = Readonly<{
  value: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}>;

export function ChatComposer({
  value,
  isSubmitting,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim() || isSubmitting) {
      return;
    }

    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
      className="border-t border-border bg-surface p-3 sm:p-4"
    >
      <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2 focus-within:border-primary">
        <label htmlFor="chat-message" className="sr-only">
          Ask a question
        </label>

        <textarea
          id="chat-message"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          maxLength={1000}
          rows={1}
          placeholder="Ask a question about your documents..."
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />

        <button
          type="submit"
          disabled={!value.trim() || isSubmitting}
          aria-label="Send message"
          title="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </form>
  );
}
