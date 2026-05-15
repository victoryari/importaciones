const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, name: true, type: true }
  });
  console.log(JSON.stringify(warehouses, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
