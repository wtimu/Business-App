import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  ADMIN_JWT_EXPIRES_IN: z.string().default('8h'),
  SMS_FROM: z.string().default('WiFiBilling'),
  MTN_MOMO_COLLECTION_PRIMARY_KEY: z.string().optional(),
  MTN_MOMO_USER_ID: z.string().optional(),
  MTN_MOMO_API_KEY: z.string().optional(),
  MTN_MOMO_BASE_URL: z.string().optional(),
  MTN_MOMO_CALLBACK_URL: z.string().optional(),
  AIRTEL_CLIENT_ID: z.string().optional(),
  AIRTEL_CLIENT_SECRET: z.string().optional(),
  AIRTEL_BASE_URL: z.string().optional(),
  AIRTEL_CALLBACK_URL: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
