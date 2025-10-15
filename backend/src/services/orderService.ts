import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { PaymentProviderName } from '../payments/index.js';
import { HttpError } from '../middleware/errorHandler.js';
import { normalizeMsisdn } from '../utils/msisdn.js';

export const createPendingOrder = async ({
  packageId,
  msisdn,
  provider
}: {
  packageId: string;
  msisdn: string;
  provider: PaymentProviderName;
}) => {
  const servicePackage = await prisma.package.findFirst({
    where: { id: packageId, isActive: true }
  });
  if (!servicePackage) {
    throw new HttpError(404, 'Package not found or inactive');
  }

  const normalizedMsisdn = normalizeMsisdn(msisdn);
  return prisma.order.create({
    data: {
      msisdn: normalizedMsisdn,
      provider,
      packageId: servicePackage.id,
      amountUgx: servicePackage.priceUgx,
      status: 'PENDING',
      providerTxRef: randomUUID()
    }
  });
};

export const getOrderById = (id: string) =>
  prisma.order.findUnique({
    where: { id },
    include: {
      package: true,
      voucher: true
    }
  });

export const getOrderByProviderRef = (providerTxRef: string) =>
  prisma.order.findFirst({
    where: { providerTxRef },
    include: { package: true, voucher: true }
  });

export const markOrderPaid = async ({
  orderId,
  providerTxId
}: {
  orderId: string;
  providerTxId: string;
}) => {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      providerTxId,
      callbackVerifiedAt: new Date()
    }
  });
};

export const markOrderFailed = async ({
  orderId,
  reason
}: {
  orderId: string;
  reason?: string;
}) =>
  prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'FAILED',
      failureReason: reason,
      callbackVerifiedAt: new Date()
    }
  });
