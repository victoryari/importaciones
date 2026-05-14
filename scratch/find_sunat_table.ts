import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = new URL("mysql://root:@localhost:3306/importaciones");
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
});
const prisma = new PrismaClient({ adapter });

async function run() {
  const d = await (prisma as any).sunatTable.groupBy({ by: ['tableName'] });
  console.log('--- TABLES ---');
  console.log(JSON.stringify(d, null, 2));
  
  const sample = await (prisma as any).sunatTable.findMany({
    where: { name: { contains: 'FACTURA' } },
    take: 5
  });
  console.log('--- SAMPLE WITH FACTURA ---');
  console.log(JSON.stringify(sample, null, 2));
}

run().finally(() => prisma.$disconnect());
