import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const productCode = 'PJ01-Z001.A';
  const product = await (prisma as any).product.findFirst({ where: { code: productCode } });
  
  if (!product) {
    console.log('Producto no encontrado');
    return;
  }

  const cuzco = await (prisma as any).warehouse.findFirst({ where: { name: { contains: 'CUZCO' } } });
  const comprobante = await (prisma as any).warehouse.findUnique({ where: { name: 'Comprobante' } });
  const despacho = await (prisma as any).warehouse.findUnique({ where: { name: 'Despacho' } });

  console.log(`Limpiando stock para ${productCode}...`);

  await prisma.$transaction(async (tx) => {
    let totalToReturn = 0;

    // 1. Limpiar Comprobante
    if (comprobante) {
      const s = await (tx as any).stock.findFirst({ where: { productId: product.id, warehouseId: comprobante.id } });
      if (s && s.quantity > 0) {
        console.log(`Retirando ${s.quantity} de Comprobante`);
        totalToReturn += s.quantity;
        await (tx as any).stock.update({ where: { id: s.id }, data: { quantity: 0 } });
      }
    }

    // 2. Limpiar Despacho
    if (despacho) {
      const s = await (tx as any).stock.findFirst({ where: { productId: product.id, warehouseId: despacho.id } });
      if (s && s.quantity > 0) {
        console.log(`Retirando ${s.quantity} de Despacho`);
        totalToReturn += s.quantity;
        await (tx as any).stock.update({ where: { id: s.id }, data: { quantity: 0 } });
      }
    }

    // 3. Devolver a CUZCO
    if (cuzco && totalToReturn > 0) {
      const s = await (tx as any).stock.findFirst({ where: { productId: product.id, warehouseId: cuzco.id } });
      if (s) {
        console.log(`Devolviendo ${totalToReturn} a ${cuzco.name}. Nuevo total: ${s.quantity + totalToReturn}`);
        await (tx as any).stock.update({ where: { id: s.id }, data: { quantity: { increment: totalToReturn } } });
      }
    }

    // 4. Borrar movimientos huérfanos (sin pedido)
    const deleted = await (tx as any).stockMovement.deleteMany({
      where: {
        productId: product.id,
        orderId: null,
        type: 'TRANSFER',
        OR: [
          { fromWarehouseId: cuzco?.id },
          { toWarehouseId: comprobante?.id },
          { toWarehouseId: despacho?.id }
        ]
      }
    });
    console.log(`Movimientos huérfanos eliminados: ${deleted.count}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
