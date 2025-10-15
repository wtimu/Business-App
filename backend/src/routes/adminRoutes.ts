import { Router } from 'express';
import { adminLogin, adminOrders } from '../controllers/adminController.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adminRouter = Router();

adminRouter.post('/login', asyncHandler(adminLogin));
adminRouter.get('/orders', adminAuth, asyncHandler(adminOrders));
