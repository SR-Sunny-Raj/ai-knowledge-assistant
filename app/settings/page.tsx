import type { Metadata } from 'next';
import { CheckCircle2, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { SettingsSignOutButton } from '../../components/settings/settings-sign-out-button';
import { requireCurrentUser } from '../../lib/session';

export const metadata: Metadata = {
  title: 'Settings | AI Knowledge Assistant',
};

export const instant = false;

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const initial = user.name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your account and review its security status.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <UserRound aria-hidden="true" size={19} className="text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Account</h2>
            <p className="mt-0.5 text-xs text-muted">
              Profile details are managed by Google.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-lg font-semibold text-primary"
            >
              {initial}
            </span>

            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {user.name}
              </p>
              <p
                className="mt-0.5 truncate text-sm text-muted"
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </div>

          <dl className="mt-6 divide-y divide-border border-y border-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-sm text-muted">Authentication</dt>
              <dd className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2
                  aria-hidden="true"
                  size={16}
                  className="text-primary"
                />
                Google connected
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-sm text-muted">Account ID</dt>
              <dd
                className="max-w-[65%] truncate font-mono text-xs text-foreground"
                title={user.id}
              >
                {user.id}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <ShieldCheck aria-hidden="true" size={19} className="text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Privacy</h2>
            <p className="mt-0.5 text-xs text-muted">
              Account-level data protection is active.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="flex gap-3">
            <ShieldCheck
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-primary"
            />
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Private workspace
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Documents and conversations are scoped to your account.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <KeyRound
              aria-hidden="true"
              size={18}
              className="mt-0.5 shrink-0 text-primary"
            />
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Protected retrieval
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Search results are filtered to your owned documents.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <h2 className="font-semibold text-foreground">Current session</h2>
          <p className="mt-1 text-sm text-muted">
            Sign out of this browser when you finish working.
          </p>
        </div>

        <SettingsSignOutButton />
      </section>
    </div>
  );
}
