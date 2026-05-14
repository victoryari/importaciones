const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, stock: true, costPrice: true }
  });
  const s = await prisma.supplier.findFirst();
  const w = await prisma.warehouse.findFirst();
  console.log('PRODUCT:', JSON.stringify(p));
  console.log('SUPPLIER:', JSON.stringify(s));
  console.log('WAREHOUSE:', JSON.stringify(w));
}

main().catch(console.error).finally(() => prisma.$disconnect());
