import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.email(),
  APP_URL: z.string().min(1),
  FRONTEND_URL: z.url(),
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_PRO: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().min(1),
  POSTHOG_API_KEY: z.string().min(1),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),
  ADMIN_EMAIL: z.email(),
  APP_VERSION: z.string().default('1.0.0'),
})

export const env = envSchema.parse(process.env)

export interface Env extends z.infer<typeof envSchema> {}
