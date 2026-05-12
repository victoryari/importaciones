import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const required = ['Existencias', 'Comprobante', 'Despacho'];
  
  for (const name of required) {
    const exists = await (prisma as any).warehouse.findFirst({ where: { name } });
    if (!exists) {
      console.log(`Creating warehouse: ${name}`);
      await (prisma as any).warehouse.create({
        data: {
          name,
          address: 'Almacén de Sistema',
          isActive: true
        }
      });
    } else {
      console.log(`Warehouse exists: ${name}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
