import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@carmelita.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: 'Administrador',
    },
  });

  console.log(`User created: ${user.email}`);
  console.log(`Password: ${password}`);

  // Tipos de documento para series (DocumentType)
  const docTypes = [
    { code: 'COT', name: 'COTIZACIÓN' },
    { code: 'PED', name: 'PEDIDO' },
    { code: 'FACT', name: 'FACTURA' },
    { code: 'BOOL', name: 'BOLETA' },
    { code: 'GREM', name: 'GUÍA DE REMISIÓN' },
    { code: 'NCRE', name: 'NOTA DE CRÉDITO' },
    { code: 'NDEB', name: 'NOTA DE DÉBITO' },
  ];

  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      update: { name: dt.name },
      create: dt,
    });
  }
  console.log(`Seeded ${docTypes.length} document types`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
