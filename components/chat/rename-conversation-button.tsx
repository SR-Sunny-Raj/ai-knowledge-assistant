'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Pencil } from 'lucide-react';
import type { ConversationSummary } from '../../types/chat';

type RenameConversationButtonProps = Readonly<{
  conversation: ConversationSummary;
  isActive: boolean;
  onRenamed: (conversation: ConversationSummary) => void;
}>;

type RenameConversationResponse =
  | {
      success: true;
      conversation: ConversationSummary;
    }
  | {
      success: false;
      message: string;
    };

export function RenameConversationButton({
  conversation,
  isActive,
  onRenamed,
}: RenameConversationButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const inputId = useId();

  const [title, setTitle] = useState(conversation.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setTitle(conversation.title);
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!isRenaming) {
      dialogRef.current?.close();
    }
  }

  async function handleRename() {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Enter a conversation title.');
      return;
    }

    if (trimmedTitle === conversation.title) {
      dialogRef.current?.close();
      return;
    }

    setIsRenaming(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(conversation.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: trimmedTitle }),
        },
      );

      const result = (await response.json()) as RenameConversationResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? 'Unable to rename conversation.' : result.message,
        );
      }

      dialogRef.current?.close();
      onRenamed(result.conversation);

      if (isActive) {
        router.refresh();
      }
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : 'Unable to rename conversation.',
      );
    } finally {
      setIsRenaming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={`Rename ${conversation.title}`}
        title="Rename conversation"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-white hover:text-foreground"
      >
        <Pencil size={14} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (isRenaming) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <form
          className="p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRename();
          }}
        >
          <span className="flex size-10 items-center justify-center rounded-md bg-surface-muted text-primary">
            <Pencil size={19} />
          </span>

          <h2 id={titleId} className="mt-4 text-lg font-semibold">
            Rename conversation
          </h2>

          <label
            htmlFor={inputId}
            className="mt-5 block text-sm font-medium text-foreground"
          >
            Title
          </label>
          <input
            id={inputId}
            autoFocus
            required
            maxLength={120}
            value={title}
            disabled={isRenaming}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
          />

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isRenaming}
              onClick={closeDialog}
              className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isRenaming || !title.trim()}
              className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {isRenaming && (
                <LoaderCircle className="animate-spin" size={17} />
              )}
              {isRenaming ? 'Saving' : 'Save'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
