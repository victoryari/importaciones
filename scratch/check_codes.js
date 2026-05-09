import 'dotenv/config';
import prisma from '../server/lib/prisma.ts';

async function main() {
  const tables = ['payment_condition', 'currency', 'operation_type'];
  for (const table of tables) {
    const records = await prisma.sunatTable.findMany({ where: { tableName: table } });
    console.log(`Table: ${table}`);
    records.forEach(r => console.log(`  ${r.code}: ${r.name}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
