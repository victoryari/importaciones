const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const currencies = await prisma.sunatTable.findMany({
    where: { tableName: 'currency' }
  });
  console.log(JSON.stringify(currencies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
