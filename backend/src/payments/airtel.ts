import crypto from 'crypto';
import { config } from '../config/index.js';
import { HttpError } from '../middleware/errorHandler.js';
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentCallbackVerification,
  PaymentProvider
} from './types.js';

const generateProviderReference = () => `ATL-${crypto.randomUUID()}`;

export class AirtelProvider implements PaymentProvider {
  name: 'AIRTEL' = 'AIRTEL';

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!config.providers.airtel.baseUrl || !config.providers.airtel.clientId) {
      throw new HttpError(500, 'Airtel provider is not configured');
    }

    return {
      providerReference: generateProviderReference(),
      message: 'Airtel Money prompt has been initiated. Complete the payment to continue.'
    };
  }

  async verifyCallback(headers: Record<string, string | string[] | undefined>, body: unknown): Promise<PaymentCallbackVerification> {
    const signature = headers['x-airtel-signature'];
    const timestamp = headers['x-airtel-timestamp'];

    if (typeof signature !== 'string' || typeof timestamp !== 'string') {
      return { ok: false, reference: '', status: 'FAILED' };
    }

    const data = `${timestamp}.${JSON.stringify(body)}`;
    const expected = crypto.createHmac('sha256', config.providers.airtel.clientSecret ?? '').update(data).digest('hex');
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
    const normalizedStatus = status === 'SUCCESS' ? 'PAID' : status === 'FAILED' ? 'FAILED' : 'PENDING';

    return {
      ok: true,
      reference,
      status: normalizedStatus,
      transactionId: typeof payload.transactionId === 'string' ? payload.transactionId : undefined,
      amount: typeof payload.amount === 'number' ? payload.amount : undefined
    };
  }
}

export const airtelProvider = new AirtelProvider();
