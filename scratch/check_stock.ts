import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const product = await prisma.product.findFirst({
    where: { code: 'PJ01-Z001.A' }
  });
  console.log('PRODUCT:', product);
  
  if (product) {
    const stock = await (prisma as any).stock.findMany({
      where: { productId: product.id }
    });
    console.log('STOCK ENTRIES:', stock);
    
    const sum = stock.reduce((acc, s) => acc + s.quantity, 0);
    console.log('SUM:', sum);
  }
}

check().then(() => prisma.$disconnect());
