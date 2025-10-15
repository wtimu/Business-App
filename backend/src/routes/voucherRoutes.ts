import { Router } from 'express';
import { redeemVoucherCode, verifyVoucherCode } from '../controllers/voucherController.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const voucherRouter = Router();

voucherRouter.post('/verify', adminAuth, asyncHandler(verifyVoucherCode));
voucherRouter.post('/redeem', adminAuth, asyncHandler(redeemVoucherCode));
