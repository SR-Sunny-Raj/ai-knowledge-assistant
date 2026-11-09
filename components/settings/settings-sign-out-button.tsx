'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LogOut } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export function SettingsSignOutButton() {
  const router = useRouter();
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

  return (
    <div>
      <button
        type="button"
        disabled={isSigningOut}
        onClick={() => void handleSignOut()}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSigningOut ? (
          <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />
        ) : (
          <LogOut aria-hidden="true" size={17} />
        )}
        {isSigningOut ? 'Signing out' : 'Sign out'}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
