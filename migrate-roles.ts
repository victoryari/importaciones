import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPERADMIN' }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPERADMIN',
        permissions: JSON.stringify(['ALL'])
      }
    });
    console.log('Created SUPERADMIN role:', superAdminRole.id);
  }

  const usersToUpdate = await prisma.user.findMany({
    where: { roleId: null }
  });

  if (usersToUpdate.length > 0) {
    const updated = await prisma.user.updateMany({
      where: { roleId: null },
      data: { roleId: superAdminRole.id }
    });
    console.log(`Updated ${updated.count} users with SUPERADMIN role.`);
  } else {
    console.log('No users without roles found.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
