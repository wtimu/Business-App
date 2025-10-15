import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { HttpError } from '../middleware/errorHandler.js';

export const authenticateAdmin = async ({
  email,
  password
}: {
  email: string;
  password: string;
}) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    throw new HttpError(401, 'Invalid credentials');
  }
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = jwt.sign({ role: 'admin' }, config.jwt.secret, {
    subject: admin.id,
    expiresIn: config.jwt.expiresIn
  });

  return { token, admin };
};

export const listOrdersForAdmin = ({
  status,
  provider,
  from,
  to
}: {
  status?: string;
  provider?: string;
  from?: Date;
  to?: Date;
}) => {
  return prisma.order.findMany({
    where: {
      status: status as string | undefined,
      provider: provider as 'MTN' | 'AIRTEL' | undefined,
      createdAt: {
        gte: from,
        lte: to
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      package: true,
      voucher: true
    }
  });
};
