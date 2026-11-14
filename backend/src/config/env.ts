import { z } from 'zod';

/**
 * Environment is validated once at boot. Invalid or dangerous combinations
 * make the process exit before it can serve a single request (fail closed).
 */
const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    );

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    /** memory = in-process demo store seeded with Togo data; mongo = MongoDB */
    DATA_DRIVER: z.enum(['memory', 'mongo']).default('memory'),
    MONGODB_URI: z.string().optional(),
    /** firebase = verify Firebase ID tokens; dev = accept "dev:<uid>:<role>" (never in production) */
    AUTH_MODE: z.enum(['firebase', 'dev']).default('dev'),
    FIREBASE_PROJECT_ID: z.string().optional(),
    /** Path to a service-account JSON file, or leave empty to use Application Default Credentials */
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    /** Comma-separated browser origins allowed by CORS (native apps send no Origin header) */
    CORS_ORIGINS: csv('http://localhost:5173,http://localhost:8081,http://localhost:19006'),
    /** Emails that are bootstrapped as admins on first sign-in (must be verified in Firebase) */
    ADMIN_EMAILS: csv(''),
    IMAGE_HOSTS: csv(
      'firebasestorage.googleapis.com,storage.googleapis.com,images.unsplash.com,upload.wikimedia.org',
    ),
    /** Number of reverse-proxy hops in front of the API (for correct client IPs) */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** Reject plain-HTTP requests (checked via X-Forwarded-Proto behind a proxy) */
    REQUIRE_HTTPS: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    RATE_LIMIT_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.AUTH_MODE === 'dev')
        ctx.addIssue({ code: 'custom', path: ['AUTH_MODE'], message: 'AUTH_MODE=dev is forbidden in production' });
      if (env.DATA_DRIVER === 'memory')
        ctx.addIssue({ code: 'custom', path: ['DATA_DRIVER'], message: 'DATA_DRIVER=memory is forbidden in production' });
      if (!env.RATE_LIMIT_ENABLED)
        ctx.addIssue({ code: 'custom', path: ['RATE_LIMIT_ENABLED'], message: 'Rate limiting cannot be disabled in production' });
      if (env.CORS_ORIGINS.some((o) => o === '*' || o.startsWith('http://')))
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'Production CORS origins must be explicit https:// origins' });
    }
    if (env.DATA_DRIVER === 'mongo' && !env.MONGODB_URI)
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'MONGODB_URI is required when DATA_DRIVER=mongo' });
    if (env.AUTH_MODE === 'firebase' && !env.FIREBASE_PROJECT_ID)
      ctx.addIssue({ code: 'custom', path: ['FIREBASE_PROJECT_ID'], message: 'FIREBASE_PROJECT_ID is required when AUTH_MODE=firebase' });
  })
  .transform((env) => ({
    ...env,
    REQUIRE_HTTPS: env.REQUIRE_HTTPS ?? env.NODE_ENV === 'production',
    isProd: env.NODE_ENV === 'production',
  }));

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  return parsed.data;
}

/** Test/dev helper: build an Env from partial overrides. */
export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...overrides });
}
