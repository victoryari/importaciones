const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- BUSCANDO COMPRA DUA 2026-199328 ---');
  const purchases = await prisma.purchase.findMany({
    where: {
      OR: [
        { docNumber: { contains: '199328' } },
        { docSeries: { contains: '2026' } }
      ]
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      warehouse: true
    }
  });

  console.log(`Encontradas ${purchases.length} compras.`);
  for (const p of purchases) {
    console.log(`\nCompra ID: ${p.id}`);
    console.log(`Documento: ${p.docSeries}-${p.docNumber}`);
    console.log(`Fecha: ${p.date}`);
    console.log(`Estado: ${p.status || 'N/A'}`);
    console.log(`Almacén Recepción ID: ${p.warehouseId} (${p.warehouse?.name || 'N/A'})`);
    console.log('Ítems de la compra:');
    for (const item of p.items) {
      console.log(`  - Producto: ID ${item.productId} (${item.product?.name})`);
      console.log(`    Lote: ${item.lotNumber}`);
      console.log(`    Cantidad Compra: ${item.quantity}`);
      
      // Buscar stock actual en el almacén de la compra
      const stock = await prisma.stock.findMany({
        where: {
          productId: item.productId,
          warehouseId: p.warehouseId,
          lotNumber: item.lotNumber || null
        }
      });
      console.log(`    Stock actual en almacén de recepción:`, stock.map(s => ({ id: s.id, quantity: s.quantity, lotNumber: s.lotNumber })));

      // Buscar movimientos para este producto y lote
      const movements = await prisma.stockMovement.findMany({
        where: {
          productId: item.productId,
          lotNumber: item.lotNumber || null
        },
        include: {
          fromWarehouse: true,
          toWarehouse: true
        },
        orderBy: { createdAt: 'desc' }
      });
      console.log(`    Movimientos registrados para este producto/lote (total ${movements.length}):`);
      for (const m of movements) {
        console.log(`      * SM ID ${m.id} | Tipo: ${m.type} | Cant: ${m.quantity} | Origen: ${m.fromWarehouse?.name} | Destino: ${m.toWarehouse?.name} | Status: ${m.status} | Creado: ${m.createdAt} | Obs: ${m.observation}`);
      }
    }
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
