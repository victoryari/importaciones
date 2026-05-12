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
    console.log('ENTRIES FOUND:', stockEntries.length);
    stockEntries.forEach(s => {
      console.log(`- QTY: ${s.quantity}, WH: ${s.warehouse.name}, ZONE: ${s.zone?.name || 'N/A'}, LOT: ${s.lotNumber || 'N/A'}`);
    });
  }
}

check().then(() => prisma.$disconnect());
