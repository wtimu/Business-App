import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticateAdmin, listOrdersForAdmin } from '../services/adminService.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const adminLogin = async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const result = await authenticateAdmin(payload);
  res.json({ token: result.token });
};

export const adminOrders = async (req: Request, res: Response) => {
  const { status, provider, from, to } = req.query;
  const orders = await listOrdersForAdmin({
    status: typeof status === 'string' ? status : undefined,
    provider: typeof provider === 'string' ? provider : undefined,
    from: typeof from === 'string' ? new Date(from) : undefined,
    to: typeof to === 'string' ? new Date(to) : undefined
  });
  res.json({ data: orders });
};
