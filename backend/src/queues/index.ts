import { Queue, QueueScheduler, Worker } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import type { Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(config.redisUrl);

export type PaymentJobData = {
  orderId: string;
  provider: 'MTN' | 'AIRTEL';
  payload: {
    status: 'PENDING' | 'PAID' | 'FAILED';
    transactionId?: string;
    amount?: number;
  };
};

export type SmsJobData = {
  to: string;
  message: string;
};

export const paymentQueue = new Queue<PaymentJobData>('payment-confirmation', {
  connection
});

export const smsQueue = new Queue<SmsJobData>('sms-dispatch', {
  connection
});

new QueueScheduler('payment-confirmation', { connection });
new QueueScheduler('sms-dispatch', { connection });

export const createPaymentWorker = (handler: (job: Job<PaymentJobData>) => Promise<void>) =>
  new Worker<PaymentJobData>('payment-confirmation', handler, { connection });

export const createSmsWorker = (handler: (job: Job<SmsJobData>) => Promise<void>) =>
  new Worker<SmsJobData>('sms-dispatch', handler, { connection });

connection.on('error', (error) => {
  logger.error({ error }, 'Redis connection error');
});
