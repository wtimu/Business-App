export type SmsPayload = {
  to: string;
  message: string;
};

export interface SmsProvider {
  send(payload: SmsPayload): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(payload: SmsPayload): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('SMS dispatched', payload);
    }
  }
}

let provider: SmsProvider = new ConsoleSmsProvider();

export const setSmsProvider = (next: SmsProvider) => {
  provider = next;
};

export const getSmsProvider = () => provider;

export const sendSms = async (payload: SmsPayload) => {
  await provider.send(payload);
};
