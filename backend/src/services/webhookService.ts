import { prisma } from '../lib/prisma.js';

export const recordWebhookEvent = (data: {
  provider: 'MTN' | 'AIRTEL';
  rawPayload: unknown;
  signatureValid: boolean;
  orderId?: string;
}) =>
  prisma.webhookEvent.create({
    data: {
      provider: data.provider,
      rawPayload: data.rawPayload as object,
      signatureValid: data.signatureValid,
      orderId: data.orderId ?? null
    }
  });
