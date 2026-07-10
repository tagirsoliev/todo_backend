import 'dotenv/config';
import { z } from 'zod';

// Single source of process.env in the project. On a missing required variable
// the app exits at startup with a clear error.
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL обязателен (connection string от Neon)'),

  // Same bot token as TODO_bot's BOT_TOKEN — required to verify the HMAC hash
  // of the Telegram Login Widget payload (Telegram's documented login flow).
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN обязателен (тот же, что у бота)'),

  // Signs/verifies session JWTs issued after a successful Telegram login.
  // Must be a long random secret, distinct from BOT_TOKEN.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET обязателен и должен быть длиной от 32 символов'),
  // Session lifetime in seconds. Default: 7 days.
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(7 * 24 * 60 * 60),

  // Origin(s) allowed to call the API from a browser (the Next.js site).
  // Comma-separated for multiple environments (e.g. local + prod).
  WEB_ORIGIN: z.string().default('http://localhost:3000'),

  // Shared secret for Vercel Cron Jobs. Vercel sends it as `Authorization:
  // Bearer <CRON_SECRET>` when invoking scheduled routes (see
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
  CRON_SECRET: z
    .string()
    .min(16, 'CRON_SECRET обязателен и должен быть длиной от 16 символов'),

  PORT: z.coerce.number().int().positive().default(3001),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error('❌ Ошибка конфигурации .env:\n' + issues);
  process.exit(1);
}

export const config = {
  databaseUrl: parsed.data.DATABASE_URL,
  botToken: parsed.data.BOT_TOKEN,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresInSeconds: parsed.data.JWT_EXPIRES_IN_SECONDS,
  webOrigins: parsed.data.WEB_ORIGIN.split(',').map((o) => o.trim()),
  cronSecret: parsed.data.CRON_SECRET,
  port: parsed.data.PORT,
} as const;
