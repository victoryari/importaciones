import 'dotenv/config';
import prisma from '../server/lib/prisma';
import { SunatService } from '../server/services/sunatService';

async function testSunatFlow() {
  console.log('--- Iniciando Prueba de Flujo Facturación SUNAT y Multisede ---');

  // 1. Verificar Almacenes y códigos SUNAT
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    include: { series: true }
  });

  console.log(`\n1. Almacenes activos encontrados: ${warehouses.length}`);
  for (const wh of warehouses) {
    console.log(`   - [Cód. SUNAT ${wh.sunatCode || '0000'}] ${wh.name} (${wh.code || 'S/C'}) -> ${wh.series.length} series registradas`);
  }

  // 2. Elegir Almacén Zárate (0007) para prueba de venta
  const zarate = warehouses.find(w => w.sunatCode === '0007') || warehouses[0];
  console.log(`\n2. Probando emisión desde almacén: ${zarate.name} (SUNAT ${zarate.sunatCode})`);

  const zarateFacturaSeries = zarate.series.find(s => s.documentType === '01') || zarate.series[0];
  console.log(`   - Serie a utilizar: ${zarateFacturaSeries?.series || 'F002'}`);

  // 3. Crear Factura de Prueba vinculada a Zárate
  const testCustomer = await prisma.customer.findFirst() || {
    id: null,
    name: 'EMPRESA CLIENTE DEMO S.A.C.',
    docType: 'RUC',
    docNumber: '20601234567',
    address: 'AV. PRIMAVERA 456 - LIMA'
  };

  const testProduct = await prisma.product.findFirst() || {
    id: 1,
    name: 'BOLSA PLASTICA BIODEGRADABLE 10KG',
    code: 'PLAST-001',
    salePrice: 50.00
  };

  const nextNumber = zarateFacturaSeries.currentNumber + 1;
  const numberFormatted = `${zarateFacturaSeries.series}-${String(nextNumber).padStart(8, '0')}`;

  const createdInvoice = await prisma.invoice.create({
    data: {
      documentType: '01',
      series: zarateFacturaSeries.series,
      number: nextNumber,
      numberFormatted: numberFormatted,
      customerName: testCustomer.name || 'CLIENTE DEMO',
      customerDocType: '6',
      customerDocNumber: testCustomer.docNumber || '20601234567',
      customerAddress: testCustomer.address || 'LIMA',
      warehouseId: zarate.id,
      sunatEstablishmentCode: zarate.sunatCode || '0007',
      sunatStatus: 'PENDING',
      subtotal: 100.00,
      totalIgv: 18.00,
      totalAmount: 118.00,
      paymentCondition: 'CONTADO',
      items: {
        create: [
          {
            productId: testProduct.id,
            quantity: 2,
            unitMeasure: 'NIU',
            price: 59.00,
            total: 118.00
          }
        ]
      }
    }
  });

  console.log(`\n3. Factura creada en BD: ${createdInvoice.numberFormatted} (ID: ${createdInvoice.id})`);

  // 4. Enviar / Validar ante SUNAT usando SunatService
  console.log('\n4. Enviando a SUNAT / Generando UBL 2.1 y CDR...');
  const processedInvoice = await SunatService.sendInvoiceToSunat(createdInvoice.id);

  console.log(`   ✓ Estado SUNAT: ${processedInvoice.sunatStatus}`);
  console.log(`   ✓ Código Establecimiento: ${processedInvoice.sunatEstablishmentCode}`);
  console.log(`   ✓ Mensaje SUNAT: ${processedInvoice.sunatResponse}`);
  console.log(`   ✓ Hash Digital: ${processedInvoice.sunatHashCode}`);
  console.log(`   ✓ Cadena QR Oficial: ${processedInvoice.sunatQr}`);

  console.log('\n--- Flujo de Validación Exitoso ---');
}

testSunatFlow()
  .catch(e => {
    console.error('Error en prueba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
