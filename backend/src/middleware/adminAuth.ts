import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'admin';
  };
}

export const adminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, config.jwt.secret) as { sub: string; role: string };
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = { id: payload.sub, role: 'admin' };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
