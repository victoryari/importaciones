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
  console.log('Migrating stock to Existencias warehouse...');

  const existencias = await prisma.warehouse.findUnique({ where: { name: 'Existencias' } });
  if (!existencias) {
    console.error('Existencias warehouse not found. Run seed script first.');
    return;
  }

  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products.`);

  for (const product of products) {
    if (product.stock > 0) {
      await prisma.stock.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: existencias.id } },
        update: { quantity: product.stock },
        create: { productId: product.id, warehouseId: existencias.id, quantity: product.stock }
      });
      console.log(`Migrated ${product.stock} units for ${product.name}`);
    }
  }

  console.log('Stock migration completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
