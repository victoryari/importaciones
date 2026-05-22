const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    select: { id: true, warehouseStatus: true, agencyId: true, dispatchId: true }
  });
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
