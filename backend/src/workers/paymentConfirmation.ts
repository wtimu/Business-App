import type { Job } from 'bullmq';
import type { PaymentJobData } from '../queues/index.js';
import { paymentQueue, smsQueue } from '../queues/index.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { createVoucherForOrder } from '../services/voucherService.js';
import { markOrderFailed, markOrderPaid } from '../services/orderService.js';

export const processPaymentJob = async (job: Job<PaymentJobData>) => {
  const { orderId, payload } = job.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { package: true, voucher: true }
  });
  if (!order) {
    logger.warn({ orderId }, 'Order not found during reconciliation');
    return;
  }

  if (order.status === 'PAID' && order.voucher) {
    logger.info({ orderId }, 'Order already reconciled');
    return;
  }

  if (payload.status === 'PAID') {
    await markOrderPaid({ orderId, providerTxId: payload.transactionId ?? '' });
    const voucher = await createVoucherForOrder(orderId, order.package);
    await smsQueue.add('send', {
      to: order.msisdn,
      message: `Your Wi-Fi voucher for ${order.package.name}: ${voucher.code}`
    });
    logger.info({ orderId }, 'Voucher generated and SMS queued');
    return;
  }

  if (payload.status === 'FAILED') {
    await markOrderFailed({ orderId, reason: 'Provider reported failure' });
    logger.info({ orderId }, 'Order marked as failed');
  }
};

paymentQueue.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Payment job failed');
});
