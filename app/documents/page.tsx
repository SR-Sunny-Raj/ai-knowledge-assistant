import { Suspense } from 'react';
import { DocumentList } from '../../components/documents/document-list';
import { UploadForm } from '../../components/documents/upload-form';

function DocumentListSkeleton() {
  return (
    <div
      aria-label="Loading documents"
      className="animate-pulse rounded-lg border border-border bg-surface"
    >
      <div className="border-b border-border px-5 py-4">
        <div className="h-4 w-36 rounded bg-surface-muted" />
        <div className="mt-2 h-3 w-24 rounded bg-surface-muted" />
      </div>

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
        >
          <div className="size-10 rounded-md bg-surface-muted" />

          <div className="flex-1">
            <div className="h-4 max-w-52 rounded bg-surface-muted" />
            <div className="mt-2 h-3 max-w-24 rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-foreground">
          Build your knowledge base
        </h2>
        <p className="mt-1 text-sm text-muted">
          Upload PDFs that the assistant can search and reference.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:order-2">
          <UploadForm />
        </div>

        <div className="xl:order-1 xl:col-span-2">
          <Suspense fallback={<DocumentListSkeleton />}>
            <DocumentList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
