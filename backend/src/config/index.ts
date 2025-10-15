import { env } from './env.js';

export const config = {
  env: env.NODE_ENV,
  port: Number(env.PORT),
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.ADMIN_JWT_EXPIRES_IN
  },
  sms: {
    from: env.SMS_FROM
  },
  providers: {
    mtn: {
      primaryKey: env.MTN_MOMO_COLLECTION_PRIMARY_KEY,
      userId: env.MTN_MOMO_USER_ID,
      apiKey: env.MTN_MOMO_API_KEY,
      baseUrl: env.MTN_MOMO_BASE_URL,
      callbackUrl: env.MTN_MOMO_CALLBACK_URL
    },
    airtel: {
      clientId: env.AIRTEL_CLIENT_ID,
      clientSecret: env.AIRTEL_CLIENT_SECRET,
      baseUrl: env.AIRTEL_BASE_URL,
      callbackUrl: env.AIRTEL_CALLBACK_URL
    }
  }
};

export type AppConfig = typeof config;
