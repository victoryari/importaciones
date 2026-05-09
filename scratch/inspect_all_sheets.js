import XLSX from 'xlsx';

const filePath = 'c:\\laragon\\www\\importaciones\\doc\\234_tablas.xls';
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`\nSheet: ${sheetName}`);
  console.log('Row 1:', data[0]);
  console.log('Row 2:', data[1]);
  console.log('Row 3:', data[2]);
  console.log('Row 4:', data[3]);
});
