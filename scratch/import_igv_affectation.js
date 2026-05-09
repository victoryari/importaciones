import 'dotenv/config';
import prisma from '../server/lib/prisma.ts';

const records = [
  { code: '10', name: 'Gravado - Operación Onerosa' },
  { code: '11', name: 'Gravado - Retiro por premio' },
  { code: '12', name: 'Gravado - Retiro por donación' },
  { code: '13', name: 'Gravado - Retiro' },
  { code: '14', name: 'Gravado - Retiro por publicidad' },
  { code: '15', name: 'Gravado - Bonificaciones' },
  { code: '16', name: 'Gravado - Retiro por entrega a trabajadores' },
  { code: '17', name: 'Gravado - IVAP' },
  { code: '20', name: 'Exonerado - Operación Onerosa' },
  { code: '21', name: 'Exonerado - Transferencia Gratuita' },
  { code: '30', name: 'Inafecto - Operación Onerosa' },
  { code: '31', name: 'Inafecto - Retiro por Bonificación' },
  { code: '32', name: 'Inafecto - Retiro' },
  { code: '33', name: 'Inafecto - Retiro por Muestras Médicas' },
  { code: '34', name: 'Inafecto - Retiro por Convenio Colectivo' },
  { code: '35', name: 'Inafecto - Retiro por premio' },
  { code: '36', name: 'Inafecto - Retiro por publicidad' },
  { code: '40', name: 'Exportación' }
];

const tableName = 'igv_affectation_type';

async function main() {
  console.log(`Importing ${records.length} records for ${tableName}...`);
  
  for (const record of records) {
    await prisma.sunatTable.upsert({
      where: {
        tableName_code: {
          tableName,
          code: record.code
        }
      },
      update: { name: record.name },
      create: {
        tableName,
        code: record.code,
        name: record.name
      }
    });
  }
  
  console.log('Import completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
