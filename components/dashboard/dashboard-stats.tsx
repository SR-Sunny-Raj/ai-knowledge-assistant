import { connection } from 'next/server';
import { BookOpen, Files, Layers3 } from 'lucide-react';
import { connectToDatabase } from '../../lib/db';
import { requireCurrentUser } from '../../lib/session';
import { DocumentChunkModel } from '../../models/document-chunk';
import { DocumentModel } from '../../models/document';
import { StatCard } from './stat-card';

type PageTotalResult = {
  _id: null;
  totalPages: number;
};

export async function DashboardStats() {
  await connection();
  const user = await requireCurrentUser();
  await connectToDatabase();

  const [documentCount, readyDocumentCount, searchableChunkCount, pageTotals] =
    await Promise.all([
      DocumentModel.countDocuments({
        ownerId: user.id,
      }),
      DocumentModel.countDocuments({
        ownerId: user.id,
        status: 'ready',
      }),
      DocumentChunkModel.countDocuments({
        ownerId: user.id,
        embedding: {
          $exists: true,
        },
      }),
      DocumentModel.aggregate<PageTotalResult>([
        {
          $match: {
            ownerId: user.id,
            status: 'ready',
          },
        },
        {
          $group: {
            _id: null,
            totalPages: {
              $sum: '$pageCount',
            },
          },
        },
      ]),
    ]);

  const totalPages = pageTotals[0]?.totalPages ?? 0;

  const statistics = [
    {
      title: 'Documents',
      value: documentCount.toString(),
      description: `${readyDocumentCount} ready for AI search`,
      icon: Files,
    },
    {
      title: 'Searchable chunks',
      value: searchableChunkCount.toString(),
      description: 'Text sections with semantic embeddings',
      icon: Layers3,
    },
    {
      title: 'Indexed pages',
      value: totalPages.toString(),
      description: 'PDF pages available to the assistant',
      icon: BookOpen,
    },
  ];

  return (
    <section
      aria-label="Knowledge base statistics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {statistics.map((statistic) => (
        <StatCard key={statistic.title} {...statistic} />
      ))}
    </section>
  );
}
