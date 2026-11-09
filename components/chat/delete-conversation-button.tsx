'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react';

type DeleteConversationButtonProps = Readonly<{
  conversationId: string;
  conversationTitle: string;
  isActive: boolean;
  onDeleted: (conversationId: string) => void;
}>;

type DeleteResponse = {
  success: boolean;
  message?: string;
};

export function DeleteConversationButton({
  conversationId,
  conversationTitle,
  isActive,
  onDeleted,
}: DeleteConversationButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!isDeleting) {
      dialogRef.current?.close();
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}`,
        {
          method: 'DELETE',
        },
      );

      const result = (await response.json()) as DeleteResponse;

      if (!response.ok && response.status !== 404) {
        throw new Error(result.message ?? 'Unable to delete conversation.');
      }

      dialogRef.current?.close();
      onDeleted(conversationId);

      if (isActive) {
        router.replace('/chat');
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete conversation.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={`Delete ${conversationTitle}`}
        title="Delete conversation"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (isDeleting) {
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
        <div className="p-6">
          <span className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </span>

          <h2 id={titleId} className="mt-4 text-lg font-semibold">
            Delete conversation?
          </h2>

          <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
            <strong className="font-medium text-foreground">
              {conversationTitle}
            </strong>{' '}
            and all of its messages will be permanently removed.
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={closeDialog}
              className="h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting && (
                <LoaderCircle className="animate-spin" size={17} />
              )}
              {isDeleting ? 'Deleting' : 'Delete'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
