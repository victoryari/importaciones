import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:\\laragon\\www\\importaciones\\doc\\234_tablas.xls';
const workbook = XLSX.readFile(filePath);

console.log('Sheets:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`\nSheet: ${sheetName}`);
  console.log('First 5 rows:', data.slice(0, 5));
});
