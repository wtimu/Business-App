export type PaymentProviderName = 'MTN' | 'AIRTEL';

export type InitiatePaymentInput = {
  msisdn: string;
  amount: number;
  reference: string;
};

export type InitiatePaymentResult = {
  providerReference: string;
  message: string;
};

export type ProviderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export type PaymentCallbackVerification = {
  ok: boolean;
  reference: string;
  status: ProviderPaymentStatus;
  transactionId?: string;
  amount?: number;
};

export interface PaymentProvider {
  name: PaymentProviderName;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyCallback(headers: Record<string, string | string[] | undefined>, body: unknown): Promise<PaymentCallbackVerification>;
}
