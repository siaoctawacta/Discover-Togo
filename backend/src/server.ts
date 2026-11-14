import 'dotenv/config';
import { createApp } from './app.js';
import { createIdentity, createRepository } from './bootstrap.js';
import { loadEnv } from './config/env.js';
import { logger } from './lib/logger.js';

async function main() {
  const env = loadEnv(); // throws (and exits) on insecure/invalid config
  const repo = await createRepository(env);
  const identity = await createIdentity(env);
  const app = createApp({ env, repo, identity });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, data: env.DATA_DRIVER, auth: env.AUTH_MODE }, 'Discover Togo API listening');
    if (env.AUTH_MODE === 'dev') logger.warn('AUTH_MODE=dev: accepting "dev:<uid>:<role>" tokens. Never use outside local development.');
  });
  // Slowloris / hung-connection protection.
  server.headersTimeout = 20_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 65_000;
  server.maxRequestsPerSocket = 1000;

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
}

main().catch((err) => {
  logger.fatal(err instanceof Error ? err.message : err);
  process.exit(1);
});
