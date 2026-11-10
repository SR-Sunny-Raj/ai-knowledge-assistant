'use client';

import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, LoaderCircle, Upload } from 'lucide-react';

type Feedback = {
  type: 'success' | 'error';
  message: string;
} | null;

type UploadResponse = {
  success: boolean;
  message?: string;
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    setFeedback(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      setFile(null);
      setFeedback({
        type: 'error',
        message: 'Please select a PDF file.',
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFeedback({
        type: 'error',
        message: 'The PDF must be smaller than 4 MB.',
      });
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const result = await response
        .json()
        .then((body) => body as UploadResponse)
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            `Upload failed with server response ${response.status}. Please try again.`,
        );
      }

      if (!result?.success) {
        throw new Error('The server returned an invalid upload response.');
      }

      setFile(null);
      setFeedback({
        type: 'success',
        message: 'Document uploaded and processed successfully.',
      });

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      router.refresh();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div>
        <h2 className="font-semibold text-foreground">Upload document</h2>
        <p className="mt-1 text-sm text-muted">
          Add a text-based PDF to your knowledge base.
        </p>
      </div>

      <label
        htmlFor="pdf-upload"
        className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:bg-surface-muted sm:px-6 sm:py-10"
      >
        {file ? (
          <FileText className="text-primary" size={28} />
        ) : (
          <Upload className="text-primary" size={28} />
        )}

        <span className="mt-3 max-w-full break-all text-sm font-medium text-foreground">
          {file ? file.name : 'Choose a PDF file'}
        </span>

        <span className="mt-1 text-xs text-muted">
          Text-based PDF, maximum 4 MB
        </span>

        <input
          ref={inputRef}
          id="pdf-upload"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      {feedback && (
        <p
          aria-live="polite"
          className={`mt-4 text-sm ${
            feedback.type === 'success' ? 'text-primary' : 'text-red-600'
          }`}
        >
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!file || isUploading}
        className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <LoaderCircle className="animate-spin" size={17} />
            Processing PDF
          </>
        ) : (
          <>
            <Upload size={17} />
            Upload document
          </>
        )}
      </button>

      <Link
        href="/chat"
        aria-disabled={isUploading}
        tabIndex={isUploading ? -1 : undefined}
        className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover ${
          isUploading ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        Start a conversation
        <ArrowRight size={16} />
      </Link>
    </form>
  );
}
