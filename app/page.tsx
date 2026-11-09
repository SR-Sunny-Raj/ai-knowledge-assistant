import Link from 'next/link';
import { Suspense } from 'react';
import { Upload } from 'lucide-react';
import { DashboardStats } from '../components/dashboard/dashboard-stats';
import { QuickStart } from '../components/dashboard/quick-start';
import { RecentDocuments } from '../components/dashboard/recent-documents';

const statisticSkeletons = ['documents', 'chunks', 'pages'];

function DashboardStatsSkeleton() {
  return (
    <section
      aria-label="Loading knowledge base statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {statisticSkeletons.map((statistic) => (
        <div
          key={statistic}
          className="h-36 animate-pulse rounded-lg border border-border bg-surface"
        />
      ))}
    </section>
  );
}

function RecentDocumentsSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-lg border border-border bg-surface" />
  );
}

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Your knowledge, organized
          </h2>
          <p className="mt-1 text-sm text-muted">
            Manage documents and ask questions from one workspace.
          </p>
        </div>

        <Link
          href="/documents"
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Upload size={17} />
          Upload document
        </Link>
      </section>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<RecentDocumentsSkeleton />}>
            <RecentDocuments />
          </Suspense>
        </div>

        <QuickStart />
      </div>
    </div>
  );
}
