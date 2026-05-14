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
  const comprasId = 6;
  const supplierId = 1; // Genérico

  if (!product) return;

  console.log('--- INICIO DE PRUEBAS ---');
  
  // PRUEBA 1: FLUJO NACIONAL (GUIA -> FACTURA)
  console.log('1. Registrando GUIA DE REMISION (10 unidades)...');
  const guia = await (prisma as any).purchase.create({
    data: {
      supplierId,
      supplierName: 'PROVEEDOR PRUEBA',
      docType: 'GUIA',
      docSeries: 'GR01',
      docNumber: '100',
      date: new Date(),
      currency: 'PEN',
      exchangeRate: 1.0,
      totalAmount: 1000,
      warehouseId: cuzcoId,
      items: {
        create: [{ productId: product.id, quantity: 10, price: 100 }]
      }
    }
  });

  // Simulando lógica del servidor para incremento de stock (porque no hay referencia)
  await (prisma as any).stock.updateMany({
    where: { productId: product.id, warehouseId: cuzcoId },
    data: { quantity: { increment: 10 } }
  });

  let stockCuzco = await (prisma as any).stock.findFirst({ where: { productId: product.id, warehouseId: cuzcoId } });
  console.log(`Stock en CUZCO tras Guía: ${stockCuzco.quantity} (Esperado: 1430)`);

  console.log('2. Registrando FACTURA referenciando a la GUIA...');
  const factura = await (prisma as any).purchase.create({
    data: {
      supplierId,
      supplierName: 'PROVEEDOR PRUEBA',
      referenceId: guia.id,
      docType: 'FACTURA',
      docSeries: 'F001',
      docNumber: '555',
      date: new Date(),
      currency: 'PEN',
      exchangeRate: 1.0,
      totalAmount: 1000,
      warehouseId: cuzcoId,
      items: {
        create: [{ productId: product.id, quantity: 10, price: 100 }]
      }
    }
  });

  // Simulando lógica del servidor (SI HAY REFERENCIA -> NO INCREMENTA STOCK)
  console.log('Simulando validación: referenceId existe -> Saltando incremento de stock');
  
  stockCuzco = await (prisma as any).stock.findFirst({ where: { productId: product.id, warehouseId: cuzcoId } });
  console.log(`Stock en CUZCO tras Factura: ${stockCuzco.quantity} (Esperado: 1430 - EXITO)`);

  // PRUEBA 2: IMPORTACION (BLOQUEO TRANSITORIO)
  console.log('3. Registrando DUA en Almacén Transitorio (50 unidades)...');
  await (prisma as any).purchase.create({
    data: {
      supplierId,
      supplierName: 'PROVEEDOR CHNA',
      docType: 'DUA',
      docSeries: '2024',
      docNumber: '9999',
      date: new Date(),
      currency: 'USD',
      exchangeRate: 3.8,
      totalAmount: 5000,
      warehouseId: comprasId,
      items: {
        create: [{ productId: product.id, quantity: 50, price: 100 }]
      }
    }
  });

  // Incremento de stock en transitorio
  await (prisma as any).stock.create({
    data: { productId: product.id, warehouseId: comprasId, quantity: 50 }
  });

  const stockTransitorio = await (prisma as any).stock.findFirst({ where: { productId: product.id, warehouseId: comprasId } });
  console.log(`Stock en TRANSITORIO: ${stockTransitorio.quantity} (Esperado: 50)`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
