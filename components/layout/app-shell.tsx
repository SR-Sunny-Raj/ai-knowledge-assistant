'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Sidebar } from './sidebar';

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  if (pathname === '/sign-in') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isMobileOpen={isMobileNavigationOpen}
        onClose={() => setIsMobileNavigationOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          isMenuOpen={isMobileNavigationOpen}
          onMenuClick={() => setIsMobileNavigationOpen((isOpen) => !isOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
