import type { Request, Response } from 'express';
import { getPaymentProvider, type PaymentProviderName } from '../payments/index.js';
import { recordWebhookEvent } from '../services/webhookService.js';
import { getOrderByProviderRef } from '../services/orderService.js';
import { paymentQueue } from '../queues/index.js';
import { logger } from '../lib/logger.js';

const processWebhook = async (providerName: PaymentProviderName, req: Request, res: Response) => {
  const provider = getPaymentProvider(providerName);
  const verification = await provider.verifyCallback(req.headers, req.body);

  const order = verification.reference ? await getOrderByProviderRef(verification.reference) : null;

  await recordWebhookEvent({
    provider: providerName,
    rawPayload: req.body,
    signatureValid: verification.ok,
    orderId: order?.id
  });

  if (!verification.ok || !order) {
    logger.warn(
      { provider: providerName, reference: verification.reference, signatureOk: verification.ok },
      'Webhook could not be matched'
    );
    return res.status(202).json({ message: 'acknowledged' });
  }

  await paymentQueue.add('reconcile', {
    orderId: order.id,
    provider: providerName,
    payload: {
      status: verification.status,
      transactionId: verification.transactionId,
      amount: verification.amount
    }
  });

  logger.info({ orderId: order.id }, 'Payment reconciliation job queued');
  return res.status(200).json({ message: 'queued' });
};

export const handleMtnWebhook = (req: Request, res: Response) => processWebhook('MTN', req, res);
export const handleAirtelWebhook = (req: Request, res: Response) => processWebhook('AIRTEL', req, res);
