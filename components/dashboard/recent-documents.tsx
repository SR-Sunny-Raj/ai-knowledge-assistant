import Link from 'next/link';
import { connection } from 'next/server';
import { ArrowRight, FileText } from 'lucide-react';
import { connectToDatabase } from '../../lib/db';
import { requireCurrentUser } from '../../lib/session';
import { DocumentModel } from '../../models/document';

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export async function RecentDocuments() {
  await connection();
  const user = await requireCurrentUser();
  await connectToDatabase();

  const recentDocuments = await DocumentModel.find({
    ownerId: user.id,
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('fileName fileSize pageCount status createdAt')
    .lean();

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold text-foreground">Recent documents</h3>
          <p className="mt-1 text-sm text-muted">
            Your latest knowledge sources
          </p>
        </div>

        <Link
          href="/documents"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
        >
          View all
          <ArrowRight size={16} />
        </Link>
      </div>

      {recentDocuments.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recentDocuments.map((document) => {
            const status = document.status ?? 'processing';

            return (
              <li
                key={document._id.toString()}
                className="flex items-center gap-3 px-5 py-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary">
                  <FileText size={19} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {document.fileName}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {formatFileSize(document.fileSize)}
                    {status === 'ready' &&
                      ` · ${document.pageCount ?? 0} pages`}
                  </p>
                </div>

                <time
                  dateTime={document.createdAt.toISOString()}
                  className="hidden text-xs text-muted sm:block"
                >
                  {dateFormatter.format(document.createdAt)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
