import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const product = await prisma.product.findFirst({
    where: { code: 'PJ01-Z001.A' }
  });
  
  if (product) {
    const stockEntries = await (prisma as any).stock.findMany({
      where: { productId: product.id },
      include: { warehouse: true, zone: true }
    });
    console.log('DETAILED STOCK ENTRIES:', JSON.stringify(stockEntries, null, 2));
  }
}

check().then(() => prisma.$disconnect());
