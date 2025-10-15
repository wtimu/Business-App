import { airtelProvider } from './airtel.js';
import { mtnProvider } from './mtn.js';
import type { PaymentProvider, PaymentProviderName } from './types.js';

const providers: Record<PaymentProviderName, PaymentProvider> = {
  MTN: mtnProvider,
  AIRTEL: airtelProvider
};

export const getPaymentProvider = (name: PaymentProviderName): PaymentProvider => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unsupported provider ${name}`);
  }
  return provider;
};

export * from './types.js';
