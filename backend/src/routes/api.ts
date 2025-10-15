import { Router } from 'express';
import { packageRouter } from './packageRoutes.js';
import { orderRouter } from './orderRoutes.js';
import { voucherRouter } from './voucherRoutes.js';
import { webhookRouter } from './webhookRoutes.js';
import { adminRouter } from './adminRoutes.js';

export const apiRouter = Router();

apiRouter.use('/packages', packageRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/webhooks', webhookRouter);
apiRouter.use('/vouchers', voucherRouter);
apiRouter.use('/admin', adminRouter);
