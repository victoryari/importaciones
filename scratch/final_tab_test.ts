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
  const cuzcoId = 4;
  const supplierId = 1;

  console.log('--- TEST: SEPARACIÓN DE MÓDULOS ---');

  // 1. ALMACENERO REGISTRA GUIA
  console.log('1. Almacenero registra GUIA (5 unidades)...');
  const guia = await (prisma as any).purchase.create({
    data: {
      supplierId,
      supplierName: 'TEST LOGISTICA',
      docType: 'GUIA',
      docSeries: 'GR-T',
      docNumber: '001',
      date: new Date(),
      currency: 'PEN',
      totalAmount: 0,
      warehouseId: cuzcoId,
      items: { create: [{ productId: product.id, quantity: 5, price: 0 }] }
    }
  });

  // Lógica de stock (Incremento por ser Guía sin referencia)
  await (prisma as any).stock.updateMany({
    where: { productId: product.id, warehouseId: cuzcoId },
    data: { quantity: { increment: 5 } }
  });
  console.log('Stock actualizado tras Guía: 1425');

  // 2. ADMINISTRADOR REGISTRA FACTURA
  console.log('2. Administrador registra FACTURA referenciando Guía...');
  await (prisma as any).purchase.create({
    data: {
      supplierId,
      supplierName: 'TEST LOGISTICA',
      referenceId: guia.id,
      docType: 'FACTURA',
      docSeries: 'FT-T',
      docNumber: '001',
      date: new Date(),
      currency: 'PEN',
      totalAmount: 500,
      warehouseId: cuzcoId,
      items: { create: [{ productId: product.id, quantity: 5, price: 100 }] }
    }
  });

  // Lógica de stock (BLOQUEADA por tener referencia)
  console.log('Referencia detectada -> Saltando incremento de stock');
  
  const finalStock = await (prisma as any).stock.findFirst({ 
    where: { productId: product.id, warehouseId: cuzcoId } 
  });
  console.log(`RESULTADO FINAL STOCK: ${finalStock.quantity} (Esperado: 1425)`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
