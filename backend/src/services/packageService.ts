import { prisma } from '../lib/prisma.js';

export const listActivePackages = () =>
  prisma.package.findMany({
    where: { isActive: true },
    orderBy: { priceUgx: 'asc' }
  });
