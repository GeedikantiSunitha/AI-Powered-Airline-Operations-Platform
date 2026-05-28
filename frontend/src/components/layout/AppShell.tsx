'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getCurrentUser } from '@/lib/authSession';
import type { UserRole } from '@airline-ops/shared';

const nav: Array<{ href: string; label: string; enabled: boolean; roles: UserRole[] }> = [
  {
    href: '/',
    label: 'Operations',
    enabled: true,
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    href: '/delay-risk',
    label: 'Delay Risk',
    enabled: true,
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    href: '/crew',
    label: 'Crew',
    enabled: false,
    roles: ['admin', 'operations_manager', 'crew_manager'],
  },
  {
    href: '/baggage',
    label: 'Baggage',
    enabled: false,
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    href: '/passenger-impact',
    label: 'Passenger Impact',
    enabled: false,
    roles: ['admin', 'operations_manager', 'analyst'],
  },
  {
    href: '/kpi',
    label: 'KPI',
    enabled: true,
    roles: ['admin', 'operations_manager', 'analyst', 'viewer'],
  },
  {
    href: '/copilot',
    label: 'AI Copilot',
    enabled: true,
    roles: ['admin', 'operations_manager', 'crew_manager'],
  },
  {
    href: '/alerts',
    label: 'Alerts',
    enabled: true,
    roles: ['admin', 'operations_manager', 'analyst', 'viewer'],
  },
  {
    href: '/admin',
    label: 'Admin',
    enabled: true,
    roles: ['admin'],
  },
  {
    href: '/sre',
    label: 'SRE',
    enabled: true,
    roles: ['admin', 'operations_manager'],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const currentRole = user?.role ?? 'viewer';
  const visibleNav = nav.filter((item) => item.enabled && item.roles.includes(currentRole));

  useEffect(() => {
    setIsHydrated(true);
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (pathname === '/login') return;
    const isAllowed = visibleNav.some((item) => item.href === pathname);
    if (!isAllowed && pathname !== '/') {
      router.replace('/');
    }
  }, [pathname, router, visibleNav]);

  async function onLogout(): Promise<void> {
    clearSession();
    setUser(null);
    router.replace('/login');
  }

  if (pathname === '/login') {
    return <main className="min-h-screen p-6">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-700 bg-ops-panel p-4">
        <h1 className="mb-2 text-lg font-semibold text-ops-accent">Airline Ops</h1>
        <p className="mb-6 text-xs text-slate-400">
          {!isHydrated ? 'Loading session…' : user ? `${user.username} (${user.role})` : 'Not authenticated'}
        </p>
        <nav className="flex flex-col gap-1 text-sm">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={onLogout}
          className="mt-6 w-full rounded border border-slate-600 px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
