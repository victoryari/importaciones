import 'dotenv/config';
import prisma from './server/lib/prisma';

async function main() {
  const ops = [
    { code: '11', name: 'SALIDA POR TRANSFERENCIA ENTRE ALMACENES' },
    { code: '21', name: 'ENTRADA POR TRANSFERENCIA ENTRE ALMACENES' },
    { code: '16', name: 'SALDO INICIAL' },
    { code: '99', name: 'AJUSTE POR DIFERENCIA DE INVENTARIO' },
    { code: '01', name: 'VENTA NACIONAL' },
    { code: '02', name: 'COMPRA NACIONAL' }
  ];

  for (const op of ops) {
    const exists = await prisma.sunatTable.findFirst({
      where: { tableName: 'CAT_51', code: op.code }
    });
    if (!exists) {
      await prisma.sunatTable.create({
        data: {
          tableName: 'CAT_51',
          code: op.code,
          name: op.name,
          isActive: true
        }
      });
    }
  }

  console.log("Seeding complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
