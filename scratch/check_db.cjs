const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const purchases = await prisma.purchase.findMany({
    where: {
      docSeries: { contains: 'T002' }
    },
    select: {
      id: true,
      docType: true,
      docSeries: true,
      docNumber: true,
      supplierName: true
    }
  });
  console.log(JSON.stringify(purchases, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
