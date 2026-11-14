import { pino } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  // Never write credentials or personal data to logs.
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.token', '*.password', '*.email', 'headers.authorization'],
    censor: '[redacted]',
  },
  ...(process.env.NODE_ENV === 'development' && process.stdout.isTTY ? { transport: { target: 'pino-pretty' } } : {}),
});
