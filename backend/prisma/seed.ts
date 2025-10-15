import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const packages = [
    {
      name: '1 Hour Access',
      priceUgx: 2000,
      durationMinutes: 60
    },
    {
      name: '3 Hour Access',
      priceUgx: 5000,
      durationMinutes: 180
    },
    {
      name: 'Daily Unlimited',
      priceUgx: 10000,
      durationMinutes: 24 * 60
    }
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg
    });
  }

  const adminPassword = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'admin'
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
