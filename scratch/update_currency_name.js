import 'dotenv/config';
import prisma from '../server/lib/prisma.ts';

async function main() {
  await prisma.sunatTable.updateMany({
    where: {
      tableName: 'currency',
      code: '1'
    },
    data: {
      name: 'SOLES'
    }
  });
  console.log('Currency name updated to SOLES');
}

main().catch(console.error).finally(() => prisma.$disconnect());
