import type { Request, Response } from 'express';
import { z } from 'zod';
import { redeemVoucher, verifyVoucher } from '../services/voucherService.js';
import { HttpError } from '../middleware/errorHandler.js';

const codeSchema = z.object({
  code: z.string().min(6)
});

export const verifyVoucherCode = async (req: Request, res: Response) => {
  const { code } = codeSchema.parse(req.body);
  try {
    const voucher = await verifyVoucher(code);
    res.json({
      code: voucher.code,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      package: voucher.package
    });
  } catch (error) {
    throw new HttpError(400, (error as Error).message);
  }
};

export const redeemVoucherCode = async (req: Request, res: Response) => {
  const { code } = codeSchema.parse(req.body);
  try {
    const voucher = await verifyVoucher(code);
    await redeemVoucher(voucher.code);
    res.json({ message: 'Voucher redeemed' });
  } catch (error) {
    throw new HttpError(400, (error as Error).message);
  }
};
