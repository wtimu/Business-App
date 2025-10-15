import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { mtnProvider } from '../src/payments/mtn.js';
import { airtelProvider } from '../src/payments/airtel.js';

describe('payment providers', () => {
  it('rejects MTN callback with invalid signature', async () => {
    const result = await mtnProvider.verifyCallback({}, { reference: 'ref', status: 'SUCCESSFUL' });
    expect(result.ok).toBe(false);
  });

  it('accepts MTN callback with valid signature', async () => {
    const body = { reference: 'ref-123', status: 'SUCCESSFUL', amount: 1000 };
    process.env.MTN_MOMO_COLLECTION_PRIMARY_KEY = 'secret';
    const signature = crypto
      .createHmac('sha256', 'secret')
      .update(JSON.stringify(body))
      .digest('hex');
    const result = await mtnProvider.verifyCallback({ 'x-mtn-signature': signature }, body);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('PAID');
  });

  it('accepts Airtel callback with valid signature', async () => {
    const body = { reference: 'ref-456', status: 'SUCCESS', amount: 5000 };
    process.env.AIRTEL_CLIENT_SECRET = 'airsecret';
    const timestamp = new Date().toISOString();
    const signature = crypto
      .createHmac('sha256', 'airsecret')
      .update(`${timestamp}.${JSON.stringify(body)}`)
      .digest('hex');
    const result = await airtelProvider.verifyCallback(
      { 'x-airtel-signature': signature, 'x-airtel-timestamp': timestamp },
      body
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe('PAID');
  });
});
