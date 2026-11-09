'use client';

import Image from 'next/image';
import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export function GoogleSignInButton() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });

      if (result.error) {
        throw new Error(
          result.error.message ?? 'Unable to sign in with Google.',
        );
      }
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : 'Unable to sign in with Google.',
      );

      setIsSigningIn(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={isSigningIn}
        onClick={() => void handleSignIn()}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningIn ? (
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
        ) : (
          <Image
            src="/google-symbol.png"
            alt=""
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        )}

        {isSigningIn ? 'Connecting to Google' : 'Continue with Google'}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
