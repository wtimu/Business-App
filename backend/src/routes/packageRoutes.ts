import { Router } from 'express';
import { getPackages } from '../controllers/packageController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const packageRouter = Router();

packageRouter.get('/', asyncHandler(getPackages));
