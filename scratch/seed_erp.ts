import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';
dotenv.config();

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding initial data...');

  // 1. Warehouses
  const warehouses = [
    { name: 'Existencias' },
    { name: 'Comprobante' },
    { name: 'Despacho' }
  ];

  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { name: w.name },
      update: {},
      create: w
    });
  }
  console.log('Warehouses seeded.');

  // 2. Shipping Zones
  const zones = [
    { name: 'Cerca', baseRate: 10 },
    { name: 'Media', baseRate: 20 },
    { name: 'Lejos', baseRate: 35 }
  ];

  for (const z of zones) {
    await prisma.shippingZone.upsert({
      where: { name: z.name },
      update: { baseRate: z.baseRate },
      create: z
    });
  }
  console.log('Shipping zones seeded.');

  console.log('Initial data seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
