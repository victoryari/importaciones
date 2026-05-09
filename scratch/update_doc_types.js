import 'dotenv/config';
import prisma from '../server/lib/prisma.ts';

const records = [
  { code: '01', name: 'FACTURA' },
  { code: '03', name: 'BOLETA DE VENTA' },
  { code: '07', name: 'NOTA DE CREDITO' },
  { code: '08', name: 'NOTA DE DEBITO' },
  { code: '09', name: 'GUIA DE REMISIÓN REMITENTE' },
  { code: '12', name: 'TICKET DE MAQUINA REGISTRADORA' },
  { code: '13', name: 'DOCUMENTO EMITIDO POR BANCOS, INSTITUCIONES FINANCIERAS, CREDITICIAS Y DE SEGUROS' },
  { code: '14', name: 'RECIBO SERVICIOS PUBLICOS' },
  { code: '16', name: 'BOLETO DE VIAJE - TRANSPORTE PÚBLICO INTERPROVINCIAL' },
  { code: '18', name: 'DOCUMENTOS EMITIDOS POR LAS AFP' },
  { code: '20', name: 'COMPROBANTE DE RETENCION' },
  { code: '31', name: 'GUIA DE REMISIÓN TRANSPORTISTA' },
  { code: '40', name: 'COMPROBANTE DE PERCEPCION' },
  { code: '41', name: 'COMPROBANTE DE PERCEPCION – VENTA INTERNA (FÍSICO)' },
  { code: '56', name: 'COMPROBANTE DE PAGO SEAE' },
  { code: '71', name: 'GUIA DE REMISIÓN REMITENTE COMPLEMENTARIA' },
  { code: '72', name: 'GUIA DE REMISIÓN TRANSPORTISTA COMPLEMENTARIA' }
];

const tableName = 'doc_type';

async function main() {
  console.log(`Updating ${records.length} records for ${tableName}...`);
  
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
  
  console.log('Update completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
