/** Maps API route prefixes and frontend paths to feature flag keys. */
export const MODULE_FLAG_BY_API_PREFIX: Record<string, string> = {
  '/api/v1/booking': 'module_booking',
  '/api/v1/commercial': 'module_commercial',
  '/api/v1/copilot': 'module_copilot',
  '/api/v1/mlops': 'module_mlops',
  '/api/v1/sre': 'module_sre',
  '/api/v1/operations': 'module_operations',
};

export const MODULE_FLAG_BY_PATH: Record<string, string> = {
  '/booking': 'module_booking',
  '/my-trips': 'module_booking',
  '/commercial': 'module_commercial',
  '/copilot': 'module_copilot',
  '/sre': 'module_sre',
  '/crew': 'module_operations',
  '/baggage': 'module_operations',
  '/passenger-impact': 'module_operations',
};
