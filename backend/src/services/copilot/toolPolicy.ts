import type { UserRole } from '@airline-ops/shared';

export type ToolSensitivity = 'read' | 'write' | 'high_impact';

interface ToolPolicyRule {
  sensitivity: ToolSensitivity;
  allowedRoles: UserRole[];
}

const TOOL_POLICIES: Record<string, ToolPolicyRule> = {
  get_flight_status: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  query_delay_predictions: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  get_weather_risk: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  get_airport_congestion: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'crew_manager', 'analyst', 'viewer'],
  },
  list_crew_assignments: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'crew_manager'],
  },
  get_passenger_connections: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'analyst'],
  },
  get_fuel_variance: {
    sensitivity: 'read',
    allowedRoles: ['admin', 'operations_manager', 'analyst'],
  },
  suggest_crew_swap: {
    sensitivity: 'high_impact',
    allowedRoles: ['admin', 'operations_manager', 'crew_manager'],
  },
};

export const toolPolicy = {
  getPolicy(toolName: string): ToolPolicyRule | null {
    return TOOL_POLICIES[toolName] ?? null;
  },

  authorize(
    role: UserRole,
    toolName: string
  ): { allowed: boolean; sensitivity: ToolSensitivity; reason?: string } {
    const policy = TOOL_POLICIES[toolName];
    if (!policy) {
      return {
        allowed: false,
        sensitivity: 'high_impact',
        reason: `Unknown tool: ${toolName}`,
      };
    }
    if (!policy.allowedRoles.includes(role)) {
      return {
        allowed: false,
        sensitivity: policy.sensitivity,
        reason: `Role ${role} cannot invoke ${toolName}`,
      };
    }
    return { allowed: true, sensitivity: policy.sensitivity };
  },

  requiresApproval(sensitivity: ToolSensitivity): boolean {
    return sensitivity === 'high_impact';
  },
};
