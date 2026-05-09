import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
  });
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany();
  console.log('Usuarios en la DB:', users.map(u => ({ id: u.id, email: u.email, name: u.name })));
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
