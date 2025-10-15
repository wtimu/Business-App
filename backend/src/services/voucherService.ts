import { addMinutes } from 'date-fns';
import { prisma } from '../lib/prisma.js';
import type { Package } from '@prisma/client';
import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateSegment = () =>
  Array.from({ length: 4 })
    .map(() => ALPHABET[crypto.randomInt(0, ALPHABET.length)])
    .join('');

const generateVoucherCode = () => `AD-${generateSegment()}-${generateSegment()}`;

export const createVoucherForOrder = async (orderId: string, pkg: Package) => {
  const expiresAt = addMinutes(new Date(), pkg.durationMinutes ?? 60);
  const voucher = await prisma.voucher.create({
    data: {
      code: generateVoucherCode(),
      packageId: pkg.id,
      status: 'UNUSED',
      expiresAt,
      generatedForOrderId: orderId
    }
  });
  return voucher;
};

export const verifyVoucher = async (code: string) => {
  const voucher = await prisma.voucher.findUnique({
    where: { code },
    include: { package: true }
  });
  if (!voucher) {
    throw new Error('Voucher not found');
  }
  if (voucher.status !== 'UNUSED') {
    throw new Error('Voucher already used');
  }
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    throw new Error('Voucher expired');
  }
  return voucher;
};

export const redeemVoucher = async (code: string) => {
  return prisma.voucher.update({
    where: { code },
    data: {
      status: 'USED',
      redeemedAt: new Date()
    }
  });
};
