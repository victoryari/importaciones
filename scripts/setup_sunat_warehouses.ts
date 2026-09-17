import 'dotenv/config';
import prisma from '../server/lib/prisma';

async function main() {
  console.log('--- Configurando Códigos SUNAT y Series de Almacén ---');

  // 1. Actualizar Almacenes
  const warehousesToUpdate = [
    {
      id: 5,
      name: 'TIENDA CUZCO',
      sunatCode: '0000',
      address: 'JR. CUZCO 809 A',
      code: 'TNDA-01',
      series: [
        { documentType: 'COT', series: '001' },
        { documentType: 'PED', series: '001' },
        { documentType: '01', series: 'F001' },
        { documentType: '03', series: 'B001' },
        { documentType: '07', series: 'F001' },
        { documentType: '07', series: 'B001' },
        { documentType: '09', series: 'T000' }
      ]
    },
    {
      id: 4,
      name: 'ALMACEN CUZCO',
      sunatCode: '0003',
      address: 'JR. CUZCO 1048',
      code: 'ALMC-01',
      series: [
        { documentType: 'COT', series: '002' },
        { documentType: 'PED', series: '002' },
        { documentType: '01', series: 'F003' },
        { documentType: '03', series: 'B003' },
        { documentType: '09', series: 'T002' },
        { documentType: '07', series: 'F003' },
        { documentType: '07', series: 'B003' }
      ]
    },
    {
      id: 12,
      name: 'ALMACÉN ZARATE',
      sunatCode: '0007',
      address: 'JR. SAN FEDERICO 593 URB. AZCARRUNS BAJO - ZARATE - SJL',
      code: 'ALMC-02',
      series: [
        { documentType: 'COT', series: '003' },
        { documentType: 'PED', series: '003' },
        { documentType: '01', series: 'F002' },
        { documentType: '03', series: 'B002' },
        { documentType: '09', series: 'T001' },
        { documentType: '07', series: 'F002' },
        { documentType: '07', series: 'B002' }
      ]
    }
  ];

  for (const wh of warehousesToUpdate) {
    // Actualizar Almacén
    await prisma.warehouse.updateMany({
      where: { id: wh.id },
      data: {
        sunatCode: wh.sunatCode,
        address: wh.address,
        code: wh.code
      }
    });
    console.log(`✓ Almacén "${wh.name}" actualizado con Código SUNAT: ${wh.sunatCode}`);

    // Asegurar series
    for (const s of wh.series) {
      const existing = await prisma.documentSeries.findFirst({
        where: {
          warehouseId: wh.id,
          documentType: s.documentType,
          series: s.series
        }
      });

      if (!existing) {
        await prisma.documentSeries.create({
          data: {
            warehouseId: wh.id,
            documentType: s.documentType,
            series: s.series,
            currentNumber: 0,
            isActive: true
          }
        });
        console.log(`  + Serie creada: ${s.documentType} - ${s.series} (Almacén ID ${wh.id})`);
      } else {
        console.log(`  • Serie existente: ${s.documentType} - ${s.series}`);
      }
    }
  }

  console.log('--- Proceso completado exitosamente ---');
}

main()
  .catch(e => {
    console.error('Error al configurar almacenes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
