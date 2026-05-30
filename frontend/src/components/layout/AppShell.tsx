'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getCurrentUser } from '@/lib/authSession';
import { api } from '@/lib/apiClient';
import type { UserRole } from '@airline-ops/shared';

const PATH_FLAG_KEYS: Record<string, string> = {
  '/booking': 'module_booking',
  '/my-trips': 'module_booking',
  '/commercial': 'module_commercial',
  '/copilot': 'module_copilot',
  '/sre': 'module_sre',
  '/crew': 'module_operations',
  '/baggage': 'module_operations',
  '/passenger-impact': 'module_operations',
};

const nav: Array<{
  href: string;
  label: string;
  flagKey?: string;
  roles: UserRole[];
}> = [
  {
    href: '/',
    label: 'Operations',
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    href: '/delay-risk',
    label: 'Delay Risk',
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    href: '/crew',
    label: 'Crew',
    flagKey: 'module_operations',
    roles: ['admin', 'operations_manager', 'crew_manager'],
  },
  {
    href: '/baggage',
    label: 'Baggage',
    flagKey: 'module_operations',
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    href: '/passenger-impact',
    label: 'Passenger Impact',
    flagKey: 'module_operations',
    roles: ['admin', 'operations_manager', 'analyst'],
  },
  {
    href: '/kpi',
    label: 'KPI',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer'],
  },
  {
    href: '/copilot',
    label: 'AI Copilot',
    flagKey: 'module_copilot',
    roles: ['admin', 'operations_manager', 'crew_manager'],
  },
  {
    href: '/alerts',
    label: 'Alerts',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer'],
  },
  {
    href: '/admin',
    label: 'Admin',
    roles: ['admin'],
  },
  {
    href: '/sre',
    label: 'SRE',
    flagKey: 'module_sre',
    roles: ['admin', 'operations_manager'],
  },
  {
    href: '/booking',
    label: 'Book Flight',
    flagKey: 'module_booking',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer', 'crew_manager'],
  },
  {
    href: '/my-trips',
    label: 'My Trips',
    flagKey: 'module_booking',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer', 'crew_manager'],
  },
  {
    href: '/commercial',
    label: 'Commercial',
    flagKey: 'module_commercial',
    roles: ['admin', 'operations_manager', 'analyst'],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const currentRole = user?.role ?? 'viewer';

  const visibleNav = useMemo(
    () =>
      nav.filter((item) => {
        if (!item.roles.includes(currentRole)) return false;
        if (item.flagKey && featureFlags[item.flagKey] === false) return false;
        return true;
      }),
    [currentRole, featureFlags]
  );

  useEffect(() => {
    setIsHydrated(true);
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (!user) return;
    void api
      .getEnabledFeatureFlags()
      .then(setFeatureFlags)
      .catch(() => setFeatureFlags({}));
  }, [user]);

  useEffect(() => {
    if (pathname === '/login') return;
    const isAllowed = visibleNav.some((item) => item.href === pathname);
    const pathFlag = PATH_FLAG_KEYS[pathname];
    const moduleDisabled = pathFlag && featureFlags[pathFlag] === false;
    if ((!isAllowed && pathname !== '/') || moduleDisabled) {
      router.replace('/');
    }
  }, [pathname, router, visibleNav, featureFlags]);

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
