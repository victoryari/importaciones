const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = 'PG31-G001.A';
  
  const product = await prisma.product.findFirst({ where: { code }});
  if (!product) return console.log('Not found');

  const stock = await prisma.stock.findMany({
    where: { productId: product.id },
    include: { warehouse: true }
  });
  
  console.log('Total DB Stock Records for', code);
  let totalRaw = 0;
  let totalFiltered = 0;
  
  stock.forEach(s => {
    const wType = s.warehouse?.type?.toUpperCase() || '';
    const wName = s.warehouse?.name?.toUpperCase() || '';
    const isInternal = ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA', 'CONTROL', 'EXISTENCIAS'].includes(wType) || 
                       wName.includes('DESPACHO') || 
                       wName.includes('COMPROBANTE') || 
                       wName.includes('TRANSITO') ||
                       wName.includes('EXISTENCIAS');
                       
    console.log(`- Qty: ${s.quantity} | WH: ${wName} | Type: ${wType} | FilteredOut: ${isInternal}`);
    totalRaw += s.quantity;
    if (!isInternal) totalFiltered += s.quantity;
  });
  
  console.log(`Raw Total: ${totalRaw}`);
  console.log(`Filtered Total: ${totalFiltered}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
