'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenText,
  Files,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { AccountMenu } from '../auth/account-menu';
import { ConversationHistory } from '../chat/conversation-history';

type SidebarProps = Readonly<{
  isMobileOpen: boolean;
  onClose: () => void;
}>;

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Documents', href: '/documents', icon: Files },
  { name: 'Chat', href: '/chat', icon: MessageSquareText },
];

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isMobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-5 transition-transform lg:static lg:h-screen lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 px-2"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-white">
              <BookOpenText size={20} />
            </span>

            <span className="font-semibold text-foreground">Knowledge AI</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <Link
          href="/chat"
          onClick={onClose}
          className="mt-8 flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={17} />
          New chat
        </Link>

        <nav className="mt-6 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-foreground'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <ConversationHistory onNavigate={onClose} />

        <Link
          href="/settings"
          onClick={onClose}
          className="mt-4 flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Settings size={18} />
          Settings
        </Link>

        <AccountMenu onNavigate={onClose} />
      </aside>
    </>
  );
}
