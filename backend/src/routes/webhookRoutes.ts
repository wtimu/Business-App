import { Router } from 'express';
import { handleAirtelWebhook, handleMtnWebhook } from '../controllers/webhookController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const webhookRouter = Router();

webhookRouter.post('/mtn', asyncHandler(handleMtnWebhook));
webhookRouter.post('/airtel', asyncHandler(handleAirtelWebhook));
