import { Router } from 'express';
import { createOrder, getOrder } from '../controllers/orderController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const orderRouter = Router();

orderRouter.post('/', asyncHandler(createOrder));
orderRouter.get('/:id', asyncHandler(getOrder));
