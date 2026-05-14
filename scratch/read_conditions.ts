import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await (prisma as any).sunatPaymentCondition.findMany();
  console.log('Condiciones:', JSON.stringify(r, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
