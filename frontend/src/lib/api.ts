import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1'
});

export type Package = {
  id: string;
  name: string;
  priceUgx: number;
  durationMinutes?: number | null;
  dataMb?: number | null;
};

export type OrderResponse = {
  id: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  voucherCode: string | null;
  amountUgx: number;
  provider: 'MTN' | 'AIRTEL';
  msisdn: string;
  package: Package;
};

export type CreateOrderPayload = {
  packageId: string;
  msisdn: string;
  provider: 'MTN' | 'AIRTEL';
};

export const fetchPackages = async () => {
  const response = await api.get<{ data: Package[] }>('/packages');
  return response.data.data;
};

export const createOrder = async (payload: CreateOrderPayload) => {
  const response = await api.post('/orders', payload);
  return response.data as {
    orderId: string;
    status: string;
    providerTxRef: string;
    pollUrl: string;
    uiMessage: string;
  };
};

export const fetchOrder = async (orderId: string) => {
  const response = await api.get<OrderResponse>(`/orders/${orderId}`);
  return response.data;
};

export const adminLogin = async (email: string, password: string) => {
  const response = await api.post<{ token: string }>('/admin/login', { email, password });
  return response.data;
};

export const fetchAdminOrders = async (
  token: string,
  params: { status?: string; provider?: string; from?: string; to?: string }
) => {
  const response = await api.get<{ data: OrderResponse[] }>('/admin/orders', {
    params,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data.data;
};
