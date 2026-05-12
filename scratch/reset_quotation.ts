import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.quotation.updateMany({
    where: { docNumber: '00000001' },
    data: { status: 'PENDING' }
  });
  console.log('Reset result:', result);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
