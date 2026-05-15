const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = 'PG31-G001.A';
  const lot = 'T002-0001163';
  
  const product = await prisma.product.findFirst({ where: { code }});
  console.log('Product:', product?.id, product?.name);

  if (product) {
    const stock = await prisma.stock.findMany({
      where: { productId: product.id },
      include: { warehouse: true }
    });
    console.log('Stock Records:');
    stock.forEach(s => {
      console.log(`  - Warehouse: ${s.warehouse.name} (Type: ${s.warehouse.type})`);
      console.log(`    Qty: ${s.quantity}, Lot: ${s.lotNumber}`);
    });

    const stockSource = await prisma.stock.findFirst({
      where: { 
        productId: product.id, 
        quantity: { gte: 1 },
        lotNumber: lot,
        warehouse: {
          name: 'ALMACEN CUZCO',
          type: { 
            notIn: ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'] 
          }
        }
      },
      include: { warehouse: true }
    });
    console.log('Found source by moveStockToTemp criteria?', !!stockSource);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
