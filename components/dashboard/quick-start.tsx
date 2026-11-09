import Link from 'next/link';
import { ArrowRight, BrainCircuit } from 'lucide-react';

export function QuickStart() {
  return (
    <section className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5">
      <div>
        <span className="flex size-10 items-center justify-center rounded-md bg-accent/15 text-accent">
          <BrainCircuit size={20} />
        </span>

        <h3 className="mt-4 font-semibold text-foreground">
          Ask your knowledge base
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted">
          Get answers grounded in the documents you have uploaded.
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/chat"
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Start a conversation
          <ArrowRight size={16} />
        </Link>

        <p className="mt-3 text-center text-xs text-muted">
          Answers will include document sources.
        </p>
      </div>
    </section>
  );
}
