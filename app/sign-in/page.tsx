import Image from 'next/image';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getAuth } from '../../lib/auth';
import { GoogleSignInButton } from '../../components/auth/google-sign-in-button';

export const instant = false;

export default async function SignInPage() {
  const requestHeaders = await headers();
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (session) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-surface-muted">
            <Image
              src="/brand-icon.png"
              alt=""
              width={32}
              height={32}
              priority
            />
          </span>

          <span className="text-lg font-semibold">Knowledge AI</span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">Welcome back</h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            Sign in to access your documents, conversations, and grounded
            answers.
          </p>

          <div className="mt-6">
            <GoogleSignInButton />
          </div>

          <div className="mt-6 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
            Your documents and conversations will remain private to your
            account.
          </div>
        </div>
      </section>
    </main>
  );
}
