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

async function main() {
  const product = await (prisma as any).product.findFirst({ where: { code: 'PJ01-Z001.A' } });
  
  if (product) {
    // Forzar stock a 1420
    await (prisma as any).stock.updateMany({
      where: { productId: product.id, warehouseId: 4 },
      data: { quantity: 1420 }
    });

    // Limpiar basura de test
    await (prisma as any).purchaseItem.deleteMany({
      where: { purchase: { supplierName: 'TEST LOGISTICA' } }
    });
    await (prisma as any).purchase.deleteMany({
      where: { supplierName: 'TEST LOGISTICA' }
    });

    console.log('CORRECCION COMPLETADA: Stock en 1420 y base de datos limpia.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
