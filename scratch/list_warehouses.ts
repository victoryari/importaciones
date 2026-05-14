import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const w = await (prisma as any).warehouse.findMany();
  console.log('ALMACENES_DB:', JSON.stringify(w, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
