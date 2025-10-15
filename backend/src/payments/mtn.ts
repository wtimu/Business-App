import crypto from 'crypto';
import { config } from '../config/index.js';
import { HttpError } from '../middleware/errorHandler.js';
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentCallbackVerification,
  PaymentProvider
} from './types.js';

const { providers } = config;

const generateProviderReference = () => `MTN-${crypto.randomUUID()}`;

export class MtnProvider implements PaymentProvider {
  name: 'MTN' = 'MTN';

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!providers.mtn.baseUrl || !providers.mtn.primaryKey) {
      throw new HttpError(500, 'MTN provider is not configured');
    }

    // In production, call MTN MoMo Collections API here.
    return {
      providerReference: generateProviderReference(),
      message: 'MTN MoMo prompt has been sent to your phone. Complete the payment to continue.'
    };
  }

  async verifyCallback(headers: Record<string, string | string[] | undefined>, body: unknown): Promise<PaymentCallbackVerification> {
    const signature = headers['x-mtn-signature'];
    if (typeof signature !== 'string') {
      return { ok: false, reference: '', status: 'FAILED' };
    }

    const expected = crypto.createHmac('sha256', providers.mtn.primaryKey ?? '').update(JSON.stringify(body)).digest('hex');
    if (signature.length !== expected.length) {
      return { ok: false, reference: '', status: 'FAILED' };
    }
    const ok = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) {
      return { ok: false, reference: '', status: 'FAILED' };
    }

    const payload = body as Record<string, unknown>;
    const reference = String(payload.reference ?? payload.externalId ?? '');
    const status = String(payload.status ?? '').toUpperCase();
    const normalizedStatus = status === 'SUCCESSFUL' ? 'PAID' : status === 'FAILED' ? 'FAILED' : 'PENDING';

    return {
      ok: true,
      reference,
      status: normalizedStatus,
      transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : undefined,
      amount: typeof payload.amount === 'number' ? payload.amount : undefined
    };
  }
}

export const mtnProvider = new MtnProvider();
