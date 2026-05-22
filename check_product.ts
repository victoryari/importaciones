import 'dotenv/config';
import prisma from './server/lib/prisma';

async function main() {
  const items = await prisma.purchaseItem.findMany({
    include: { product: true }
  });
  console.log(items.map(i => ({ id: i.id, purchaseId: i.purchaseId, unitSymbol: i.unitSymbol, product: i.product.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
