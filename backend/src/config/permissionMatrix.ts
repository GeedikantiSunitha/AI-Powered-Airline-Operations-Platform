import type { UserRole } from '@airline-ops/shared';

export interface PermissionModule {
  moduleId: string;
  label: string;
  path: string;
  apiPrefix: string;
  roles: UserRole[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    moduleId: 'operations',
    label: 'Operations Dashboard',
    path: '/',
    apiPrefix: '/api/v1/flights',
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    moduleId: 'predictions',
    label: 'Delay Risk / Predictions',
    path: '/delay-risk',
    apiPrefix: '/api/v1/predictions',
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    moduleId: 'crew',
    label: 'Crew',
    path: '/crew',
    apiPrefix: '/api/v1/operations/crew',
    roles: ['admin', 'operations_manager', 'crew_manager'],
  },
  {
    moduleId: 'baggage',
    label: 'Baggage',
    path: '/baggage',
    apiPrefix: '/api/v1/operations/baggage',
    roles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  {
    moduleId: 'passenger_impact',
    label: 'Passenger Impact',
    path: '/passenger-impact',
    apiPrefix: '/api/v1/operations/passenger-impact',
    roles: ['admin', 'operations_manager', 'analyst'],
  },
  {
    moduleId: 'kpi',
    label: 'KPI',
    path: '/kpi',
    apiPrefix: '/api/v1/kpi',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer'],
  },
  {
    moduleId: 'copilot',
    label: 'AI Copilot',
    path: '/copilot',
    apiPrefix: '/api/v1/copilot',
    roles: ['admin', 'operations_manager', 'crew_manager'],
  },
  {
    moduleId: 'alerts',
    label: 'Alerts',
    path: '/alerts',
    apiPrefix: '/api/v1/alerts',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer'],
  },
  {
    moduleId: 'admin',
    label: 'Admin Console',
    path: '/admin',
    apiPrefix: '/api/v1/admin',
    roles: ['admin'],
  },
  {
    moduleId: 'sre',
    label: 'SRE',
    path: '/sre',
    apiPrefix: '/api/v1/sre',
    roles: ['admin', 'operations_manager'],
  },
  {
    moduleId: 'booking',
    label: 'Book Flight',
    path: '/booking',
    apiPrefix: '/api/v1/booking',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer', 'crew_manager'],
  },
  {
    moduleId: 'my_trips',
    label: 'My Trips',
    path: '/my-trips',
    apiPrefix: '/api/v1/booking/pnr',
    roles: ['admin', 'operations_manager', 'analyst', 'viewer', 'crew_manager'],
  },
  {
    moduleId: 'commercial',
    label: 'Commercial',
    path: '/commercial',
    apiPrefix: '/api/v1/commercial',
    roles: ['admin', 'operations_manager', 'analyst'],
  },
  {
    moduleId: 'mlops',
    label: 'MLOps',
    path: '/admin',
    apiPrefix: '/api/v1/mlops',
    roles: ['admin', 'operations_manager', 'analyst'],
  },
  {
    moduleId: 'security',
    label: 'Security',
    path: '/admin',
    apiPrefix: '/api/v1/security',
    roles: ['admin', 'operations_manager'],
  },
];

export function roleHasModule(role: UserRole, moduleId: string): boolean {
  const mod = PERMISSION_MODULES.find((m) => m.moduleId === moduleId);
  return mod ? mod.roles.includes(role) : false;
}
