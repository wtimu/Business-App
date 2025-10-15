import type { Job } from 'bullmq';
import { smsQueue } from '../queues/index.js';
import { sendSms } from '../sms/index.js';
import { logger } from '../lib/logger.js';

export const processSmsJob = async (job: Job) => {
  await sendSms(job.data as { to: string; message: string });
  logger.info({ jobId: job.id }, 'SMS sent');
};

smsQueue.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'SMS job failed');
});
