import Link from 'next/link';
import { FileText, Library } from 'lucide-react';
import { connectToDatabase } from '../../lib/db';
import { requireCurrentUser } from '../../lib/session';
import { DocumentModel } from '../../models/document';
import { connection } from 'next/server';
import { DeleteDocumentButton } from './delete-document-button';

const statusStyles = {
  ready: 'bg-emerald-50 text-emerald-700',
  processing: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function DocumentList() {
  await connection();
  const user = await requireCurrentUser();
  await connectToDatabase();

  const documents = await DocumentModel.find({
    ownerId: user.id,
  })
    .sort({ createdAt: -1 })
    .select('fileName fileSize pageCount status createdAt')
    .lean();

  if (documents.length === 0) {
    return (
      <section className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 text-center">
        <Library size={30} className="text-primary" />

        <h2 className="mt-4 font-semibold text-foreground">No documents yet</h2>

        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          Upload your first PDF to make its content available for AI
          conversations.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-foreground">Knowledge sources</h2>
        <p className="mt-1 text-sm text-muted">
          {documents.length} uploaded documents
        </p>
      </div>

      <ul className="divide-y divide-border">
        {documents.map((document) => {
          const status = document.status ?? 'processing';

          return (
            <li
              key={document._id.toString()}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-4 sm:px-5"
            >
              <span className="col-start-1 row-start-1 flex size-10 items-center justify-center rounded-md bg-surface-muted text-primary">
                <FileText size={19} />
              </span>

              <div className="col-start-2 row-start-1 min-w-0">
                <Link
                  href={`/documents/${document._id.toString()}`}
                  title={`Open ${document.fileName}`}
                  className="block truncate text-sm font-medium text-foreground hover:text-primary"
                >
                  {document.fileName}
                </Link>

                <p className="mt-1 text-xs text-muted">
                  {formatFileSize(document.fileSize)}
                  {status === 'ready' && ` · ${document.pageCount ?? 0} pages`}
                </p>
              </div>

              <span
                className={`col-start-2 row-start-2 justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize sm:col-start-3 sm:row-start-1 ${statusStyles[status]}`}
              >
                {status}
              </span>

              <div className="col-start-3 row-start-2 justify-self-end sm:col-start-4 sm:row-start-1">
                <DeleteDocumentButton
                  documentId={document._id.toString()}
                  fileName={document.fileName}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
