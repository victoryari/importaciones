import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
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

    const updated = await prisma.user.updateMany({
      where: { roleId: null },
      data: { roleId: superAdminRole.id }
    });
    console.log(`Updated ${updated.count} users with SUPERADMIN role.`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
