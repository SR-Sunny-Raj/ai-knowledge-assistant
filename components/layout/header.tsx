'use client';

import { usePathname } from 'next/navigation';
import { Menu, UserRound } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

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

function getUserInitials(name: string, email: string) {
  const nameParts = name.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts.at(-1)?.[0] ?? ''}`.toUpperCase();
  }

  return (nameParts[0]?.[0] ?? email.trim()[0] ?? '').toUpperCase();
}

export function Header({ isMenuOpen, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
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
        aria-label={
          session ? `User profile: ${session.user.name}` : 'User profile'
        }
        title={session?.user.name}
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
      >
        {isPending ? (
          <span className="size-4 animate-pulse rounded-full bg-white/40" />
        ) : session ? (
          getUserInitials(session.user.name, session.user.email)
        ) : (
          <UserRound aria-hidden="true" size={17} />
        )}
      </div>
    </header>
  );
}
