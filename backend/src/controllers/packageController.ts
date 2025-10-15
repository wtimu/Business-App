import type { Request, Response } from 'express';
import { listActivePackages } from '../services/packageService.js';

export const getPackages = async (_req: Request, res: Response) => {
  const packages = await listActivePackages();
  res.json({ data: packages });
};
