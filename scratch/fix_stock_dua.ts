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
  console.log('--- EMPEZANDO CORRECCIÓN DE BASE DE DATOS PARA DUA ---');
  
  await prisma.$transaction(async (tx) => {
    // 1. Restaurar stock en Almacén de Recepción/Tránsito (ID 6) para lote CN25-041 (710 unidades)
    console.log('Restaurando stock de producto 14, almacén 6, lote CN25-041...');
    const stock1 = await (tx as any).stock.findFirst({
      where: {
        productId: 14,
        warehouseId: 6,
        lotNumber: 'CN25-041'
      }
    });

    if (stock1) {
      await (tx as any).stock.update({
        where: { id: stock1.id },
        data: { quantity: 710 }
      });
      console.log(`Stock ID ${stock1.id} actualizado a 710.`);
    } else {
      const newStock1 = await (tx as any).stock.create({
        data: {
          productId: 14,
          warehouseId: 6,
          quantity: 710,
          lotNumber: 'CN25-041'
        }
      });
      console.log(`Stock creado con ID ${newStock1.id} y cantidad 710.`);
    }

    // 2. Restaurar stock en Almacén de Recepción/Tránsito (ID 6) para lote CN25-042 (710 unidades)
    console.log('Restaurando stock de producto 14, almacén 6, lote CN25-042...');
    const stock2 = await (tx as any).stock.findFirst({
      where: {
        productId: 14,
        warehouseId: 6,
        lotNumber: 'CN25-042'
      }
    });

    if (stock2) {
      await (tx as any).stock.update({
        where: { id: stock2.id },
        data: { quantity: 710 }
      });
      console.log(`Stock ID ${stock2.id} actualizado a 710.`);
    } else {
      const newStock2 = await (tx as any).stock.create({
        data: {
          productId: 14,
          warehouseId: 6,
          quantity: 710,
          lotNumber: 'CN25-042'
        }
      });
      console.log(`Stock creado con ID ${newStock2.id} y cantidad 710.`);
    }

    // 3. Corregir movimientos anulados (ID 5 y 6) en la base de datos
    console.log('Corrigiendo datos del movimiento 5...');
    await (tx as any).stockMovement.update({
      where: { id: 5 },
      data: {
        fromWarehouseId: 6,
        lotNumber: 'CN25-041'
      }
    });

    console.log('Corrigiendo datos del movimiento 6...');
    await (tx as any).stockMovement.update({
      where: { id: 6 },
      data: {
        fromWarehouseId: 6,
        lotNumber: 'CN25-042'
      }
    });

    console.log('¡Corrección transaccional finalizada con éxito!');
  });
}

main()
  .catch(e => {
    console.error('Error durante la corrección:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
