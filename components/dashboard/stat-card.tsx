import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>

        <span className="flex size-10 items-center justify-center rounded-md bg-surface-muted text-primary">
          <Icon size={20} />
        </span>
      </div>

      <p className="mt-4 text-sm text-muted">{description}</p>
    </article>
  );
}
