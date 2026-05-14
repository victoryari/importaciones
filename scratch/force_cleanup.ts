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
  const productCode = 'PJ01-Z001.A';
  const product = await (prisma as any).product.findFirst({ where: { code: productCode } });
  
  if (!product) {
    console.log('ERROR: No se encontró el producto');
    return;
  }

  console.log(`Producto encontrado ID: ${product.id}`);

  // 1. Eliminar compras de prueba
  const deletedItems = await (prisma as any).purchaseItem.deleteMany({
    where: { purchase: { docNumber: { in: ['100', '555', '9999'] } } }
  });
  const deletedPurchases = await (prisma as any).purchase.deleteMany({
    where: { docNumber: { in: ['100', '555', '9999'] } }
  });
  console.log(`Compras eliminadas: ${deletedPurchases.count}, Items eliminados: ${deletedItems.count}`);

  // 2. Forzar stock en Cusco a 1420
  await (prisma as any).stock.updateMany({
    where: { productId: product.id, warehouseId: 4 },
    data: { quantity: 1420 }
  });
  console.log('Stock en CUZCO reseteado a 1420');

  // 3. Eliminar stock en Transitorio (ID 6)
  await (prisma as any).stock.deleteMany({
    where: { productId: product.id, warehouseId: 6 }
  });
  console.log('Stock en TRANSITORIO eliminado');

  // 4. Eliminar cualquier otro rastro en Almacenes de Sistema (Despacho genérico, etc.)
  await (prisma as any).stock.deleteMany({
    where: { 
      productId: product.id, 
      warehouse: { 
        name: { in: ['Despacho', 'Comprobante', 'Existencias'] } 
      } 
    }
  });
  console.log('Almacenes de sistema limpiados');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
