'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LogOut } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

type AccountMenuProps = Readonly<{
  onNavigate?: () => void;
}>;

export function AccountMenu({ onNavigate }: AccountMenuProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(result.error.message ?? 'Unable to sign out.');
      }

      onNavigate?.();
      router.replace('/sign-in');
      router.refresh();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Unable to sign out.',
      );
      setIsSigningOut(false);
    }
  }

  if (isPending) {
    return (
      <div className="mt-3 flex h-14 shrink-0 items-center gap-3 border-t border-border px-2 pt-3">
        <span className="size-9 animate-pulse rounded-md bg-surface-muted" />
        <span className="h-4 flex-1 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const initial = session.user.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="mt-3 shrink-0 border-t border-border pt-3">
      <div className="flex min-w-0 items-center gap-3 px-2">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-sm font-semibold text-primary"
        >
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {session.user.name}
          </p>
          <p className="truncate text-xs text-muted" title={session.user.email}>
            {session.user.email}
          </p>
        </div>

        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSigningOut ? (
            <LoaderCircle
              aria-hidden="true"
              size={16}
              className="animate-spin"
            />
          ) : (
            <LogOut aria-hidden="true" size={16} />
          )}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 px-2 text-xs leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
