import type { Request, Response } from 'express';
import { z } from 'zod';
import { createPendingOrder, getOrderById } from '../services/orderService.js';
import { getPaymentProvider } from '../payments/index.js';
import { HttpError } from '../middleware/errorHandler.js';

const createOrderSchema = z.object({
  packageId: z.string().uuid(),
  msisdn: z.string(),
  provider: z.enum(['MTN', 'AIRTEL'])
});

export const createOrder = async (req: Request, res: Response) => {
  const payload = createOrderSchema.parse(req.body);
  const order = await createPendingOrder(payload);
  const provider = getPaymentProvider(payload.provider);
  const providerResult = await provider.initiatePayment({
    msisdn: order.msisdn,
    amount: order.amountUgx,
    reference: order.providerTxRef
  });

  res.status(201).json({
    orderId: order.id,
    status: order.status,
    providerTxRef: order.providerTxRef,
    pollUrl: `/api/v1/orders/${order.id}`,
    uiMessage: providerResult.message
  });
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await getOrderById(req.params.id);
  if (!order) {
    throw new HttpError(404, 'Order not found');
  }

  res.json({
    id: order.id,
    status: order.status,
    voucherCode: order.voucher?.code ?? null,
    amountUgx: order.amountUgx,
    msisdn: order.msisdn,
    package: order.package,
    provider: order.provider
  });
};
