import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
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
  console.log('--- MOSTRANDO TODO EL STOCK DEL ALMACÉN 6 ---');
  const stock6 = await (prisma as any).stock.findMany({
    where: {
      warehouseId: 6
    },
    include: {
      product: true,
      warehouse: true
    }
  });

  console.log(`Encontrados ${stock6.length} registros de stock en almacén 6:`);
  for (const s of stock6) {
    console.log(`ID: ${s.id} | Producto: ${s.product?.name} (ID: ${s.productId}) | Cantidad: ${s.quantity} | Lote: ${s.lotNumber}`);
  }

  console.log('\n--- MOSTRANDO TODO EL STOCK CON CANTIDAD > 0 DE CUALQUIER ALMACÉN ---');
  const allStock = await (prisma as any).stock.findMany({
    where: {
      quantity: { gt: 0 }
    },
    include: {
      product: true,
      warehouse: true
    }
  });
  console.log(`Encontrados ${allStock.length} registros de stock con cantidad > 0:`);
  for (const s of allStock) {
    console.log(`ID: ${s.id} | Almacén: ${s.warehouse?.name} (ID: ${s.warehouseId}) | Producto: ${s.product?.name} (ID: ${s.productId}) | Cantidad: ${s.quantity} | Lote: ${s.lotNumber}`);
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
