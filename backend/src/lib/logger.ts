import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard'
        }
      }
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: () => randomUUID()
});
