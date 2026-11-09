'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

type HeaderProps = Readonly<{
  isMenuOpen: boolean;
  onMenuClick: () => void;
}>;

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/documents': 'Documents',
  '/chat': 'AI Chat',
  '/settings': 'Settings',
};

export function Header({ isMenuOpen, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = pathname.startsWith('/chat')
    ? 'AI Chat'
    : pathname.startsWith('/documents')
      ? 'Documents'
      : (pageTitles[pathname] ?? 'Knowledge Assistant');

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="app-navigation"
          aria-expanded={isMenuOpen}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {title}
          </h1>
          <p className="hidden text-sm text-muted sm:block">
            AI-powered knowledge workspace
          </p>
        </div>
      </div>

      <div
        aria-label="User profile"
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
      >
        SR
      </div>
    </header>
  );
}
