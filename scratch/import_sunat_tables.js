import 'dotenv/config';
import prisma from '../server/lib/prisma.ts';
import XLSX from 'xlsx';
import path from 'path';
const filePath = 'c:\\laragon\\www\\importaciones\\doc\\234_tablas.xls';

const TABLE_MAPPINGS = {
  'TABLA_1': 'payment_method',
  'TABLA_2': 'document_type',
  'TABLA_4': 'currency',
  'TABLA_10': 'doc_type',
  'TABLA_12': 'operation_type'
};

async function main() {
  const workbook = XLSX.readFile(filePath);

  for (const [sheetName, tableName] of Object.entries(TABLE_MAPPINGS)) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    // Skip first 3 rows (title, empty, header)
    const rows = data.slice(3);

    console.log(`Importing ${sheetName} as ${tableName}...`);

    for (const row of rows) {
      if (!row[0] || !row[1]) continue;

      const code = String(row[0]).trim();
      const name = String(row[1]).trim();

      await prisma.sunatTable.upsert({
        where: {
          tableName_code: {
            tableName,
            code
          }
        },
        update: { name },
        create: {
          tableName,
          code,
          name
        }
      });
    }
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
