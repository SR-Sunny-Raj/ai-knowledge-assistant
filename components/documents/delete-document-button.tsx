'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react';
import { rememberDeletedDocument } from '@/lib/deleted-documents';

type DeleteDocumentButtonProps = {
  documentId: string;
  fileName: string;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
  deletedConversationIds?: string[];
};

export function DeleteDocumentButton({
  documentId,
  fileName,
}: DeleteDocumentButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isConfirming && !dialog.open) {
      dialog.showModal();
    }

    if (!isConfirming && dialog.open) {
      dialog.close();
    }
  }, [isConfirming]);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(documentId)}`,
        {
          method: 'DELETE',
        },
      );

      const result = (await response.json()) as DeleteResponse;

      if (!response.ok) {
        throw new Error(result.message ?? 'Deletion failed.');
      }

      rememberDeletedDocument(documentId);

      if (result.deletedConversationIds?.length) {
        window.dispatchEvent(
          new CustomEvent('conversations-deleted', {
            detail: result.deletedConversationIds,
          }),
        );
      }

      setIsConfirming(false);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Deletion failed.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsConfirming(true);
        }}
        aria-label={`Delete ${fileName}`}
        title="Delete document"
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={17} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        onClose={() => setIsConfirming(false)}
        onCancel={(event) => {
          if (isDeleting) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isDeleting) {
            setIsConfirming(false);
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <span className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </span>

          <h2 id="delete-dialog-title" className="mt-4 text-lg font-semibold">
            Delete document?
          </h2>

          <p
            id="delete-dialog-description"
            className="mt-2 text-sm leading-6 text-muted"
          >
            <strong className="font-medium text-foreground">{fileName}</strong>{' '}
            and its citations will be permanently removed. Chats with no other
            sources will also be deleted.
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
              onClick={() => setIsConfirming(false)}
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
