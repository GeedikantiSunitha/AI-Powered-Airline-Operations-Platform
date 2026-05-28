const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = {
  info: (...args: unknown[]) => {
    if (['info', 'debug'].includes(LOG_LEVEL)) console.log('[info]', ...args);
  },
  error: (...args: unknown[]) => console.error('[error]', ...args),
};
