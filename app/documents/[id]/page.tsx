import Link from 'next/link';
import mongoose from 'mongoose';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { connectToDatabase } from '../../../lib/db';
import { requireCurrentUser } from '../../../lib/session';
import { DocumentChunkModel } from '../../../models/document-chunk';
import { DocumentModel } from '../../../models/document';

export const instant = false;

const statusStyles = {
  ready: 'bg-emerald-50 text-emerald-700',
  processing: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};

type DocumentSourcePageProps = Readonly<{
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string | string[];
    returnTo?: string | string[];
  }>;
}>;

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function createPageHref(documentId: string, page: number, returnTo: string) {
  const searchParams = new URLSearchParams({ page: page.toString() });

  if (returnTo !== '/documents') {
    searchParams.set('returnTo', returnTo);
  }

  return `/documents/${documentId}?${searchParams.toString()}`;
}

export default async function DocumentSourcePage({
  params,
  searchParams,
}: DocumentSourcePageProps) {
  const user = await requireCurrentUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  await connection();
  await connectToDatabase();

  const document = await DocumentModel.findOne({
    _id: id,
    ownerId: user.id,
  })
    .select('fileName fileSize pageCount status')
    .lean();

  if (!document) {
    notFound();
  }

  const status = document.status ?? 'processing';
  const pageCount = Math.max(document.pageCount ?? 0, 1);
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const rawReturnTo = Array.isArray(query.returnTo)
    ? query.returnTo[0]
    : query.returnTo;
  const returnTo =
    rawReturnTo === '/chat' || rawReturnTo?.startsWith('/chat/')
      ? rawReturnTo
      : '/documents';
  const backLabel =
    returnTo === '/documents' ? 'Back to documents' : 'Back to chat';
  const parsedPage = Number.parseInt(rawPage ?? '1', 10);
  const selectedPage = Number.isFinite(parsedPage)
    ? Math.min(Math.max(parsedPage, 1), pageCount)
    : 1;

  const chunks = await DocumentChunkModel.find({
    ownerId: user.id,
    documentId: document._id,
    pageNumber: selectedPage,
  })
    .sort({ chunkIndex: 1 })
    .select('content chunkIndex')
    .lean();

  const pageNumbers = Array.from(
    { length: pageCount },
    (_, index) => index + 1,
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Link
        href={returnTo}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </Link>

      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary">
              <FileText size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-foreground">
                {document.fileName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {formatFileSize(document.fileSize)} · {pageCount} pages
              </p>
            </div>
          </div>
        </div>

        <span
          className={`self-start rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[status]}`}
        >
          {status}
        </span>
      </header>

      <div className="grid min-h-0 gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Pages</h3>
          <nav
            aria-label="Document pages"
            className="mt-2 flex gap-2 overflow-x-auto pb-2 lg:grid lg:max-h-[calc(100dvh-14rem)] lg:grid-cols-3 lg:overflow-y-auto"
          >
            {pageNumbers.map((pageNumber) => (
              <Link
                key={pageNumber}
                href={createPageHref(id, pageNumber, returnTo)}
                aria-current={pageNumber === selectedPage ? 'page' : undefined}
                className={`flex size-10 shrink-0 items-center justify-center rounded-md border text-sm font-medium ${
                  pageNumber === selectedPage
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-muted hover:border-primary hover:text-foreground'
                }`}
              >
                {pageNumber}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <h3 className="font-semibold text-foreground">
              Page {selectedPage}
            </h3>

            <div className="flex items-center gap-1">
              {selectedPage > 1 && (
                <Link
                  href={createPageHref(id, selectedPage - 1, returnTo)}
                  aria-label="Previous page"
                  title="Previous page"
                  className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
                >
                  <ChevronLeft size={18} />
                </Link>
              )}
              {selectedPage < pageCount && (
                <Link
                  href={createPageHref(id, selectedPage + 1, returnTo)}
                  aria-label="Next page"
                  title="Next page"
                  className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
                >
                  <ChevronRight size={18} />
                </Link>
              )}
            </div>
          </header>

          <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
            {chunks.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                No extractable text was stored for this page.
              </p>
            ) : (
              chunks.map((chunk) => (
                <p
                  key={chunk._id.toString()}
                  className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-foreground"
                >
                  {chunk.content}
                </p>
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
