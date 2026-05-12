import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const catalogs = [
    // Catalog 09: Tipo de Nota de Crédito
    {
      tableName: 'credit_note_type',
      data: [
        { code: '01', name: 'Anulación de la operación' },
        { code: '02', name: 'Anulación por error en el RUC' },
        { code: '03', name: 'Corrección por error en la descripción' },
        { code: '04', name: 'Descuento global' },
        { code: '05', name: 'Descuento por ítem' },
        { code: '06', name: 'Devolución total' },
        { code: '07', name: 'Devolución por ítem' },
        { code: '08', name: 'Bonificación' },
        { code: '09', name: 'Disminución en el valor' },
        { code: '10', name: 'Otros Conceptos' },
      ]
    },
    // Catalog 10: Tipo de Nota de Débito
    {
      tableName: 'debit_note_type',
      data: [
        { code: '01', name: 'Intereses por mora' },
        { code: '02', name: 'Aumento en el valor' },
        { code: '03', name: 'Penalidades/ otros conceptos' },
      ]
    },
    // Table 05: Tipo de Existencia
    {
      tableName: 'existence_type',
      data: [
        { code: '01', name: 'MERCADERÍAS' },
        { code: '02', name: 'PRODUCTOS TERMINADOS' },
        { code: '03', name: 'MATERIAS PRIMAS' },
        { code: '04', name: 'ENVASES' },
        { code: '05', name: 'MATERIALES AUXILIARES' },
        { code: '06', name: 'SUMINISTROS' },
        { code: '07', name: 'REPUESTOS' },
        { code: '08', name: 'EMBALAJES' },
        { code: '09', name: 'SUBPRODUCTOS' },
        { code: '10', name: 'DESECHOS Y DESPERDICIOS' },
        { code: '91', name: 'OTROS 1' },
        { code: '92', name: 'OTROS 2' },
        { code: '93', name: 'OTROS 3' },
        { code: '94', name: 'OTROS 4' },
        { code: '95', name: 'OTROS 5' },
        { code: '96', name: 'OTROS 6' },
        { code: '97', name: 'OTROS 7' },
        { code: '98', name: 'OTROS 8' },
        { code: '99', name: 'OTROS' },
      ]
    },
    // Table 12: Tipo de Operación
    {
      tableName: 'operation_type',
      data: [
        { code: '01', name: 'VENTA NACIONAL' },
        { code: '02', name: 'COMPRA NACIONAL' },
        { code: '03', name: 'CONSIGNACIÓN RECIBIDA' },
        { code: '04', name: 'CONSIGNACIÓN ENTREGADA' },
        { code: '05', name: 'DEVOLUCIÓN RECIBIDA' },
        { code: '06', name: 'DEVOLUCIÓN ENTREGADA' },
        { code: '07', name: 'BONIFICACIÓN' },
        { code: '08', name: 'PREMIO' },
        { code: '09', name: 'DONACIÓN' },
        { code: '10', name: 'SALIDA A PRODUCCIÓN' },
        { code: '11', name: 'SALIDA POR TRANSFERENCIA ENTRE ALMACENES' },
        { code: '12', name: 'RETIRO' },
        { code: '13', name: 'MERMAS' },
        { code: '14', name: 'DESMEDROS' },
        { code: '15', name: 'DESTRUCCIÓN' },
        { code: '16', name: 'SALDO INICIAL' },
        { code: '17', name: 'EXPORTACIÓN' },
        { code: '18', name: 'IMPORTACIÓN' },
        { code: '19', name: 'ENTRADA DE PRODUCCIÓN' },
        { code: '20', name: 'ENTRADA POR DEVOLUCIÓN DE PRODUCCIÓN' },
        { code: '21', name: 'ENTRADA POR TRANSFERENCIA ENTRE ALMACENES' },
        { code: '22', name: 'ENTRADA POR IDENTIFICACIÓN ERRÓNEA' },
        { code: '23', name: 'SALIDA POR IDENTIFICACIÓN ERRÓNEA' },
        { code: '24', name: 'ENTRADA POR DEVOLUCIÓN DEL CLIENTE' },
        { code: '25', name: 'SALIDA POR DEVOLUCIÓN AL PROVEEDOR' },
        { code: '26', name: 'ENTRADA PARA SERVICIO DE PRODUCCIÓN' },
        { code: '27', name: 'SALIDA POR SERVICIO DE PRODUCCIÓN' },
        { code: '28', name: 'AJUSTE POR DIFERENCIA DE INVENTARIO' },
        { code: '29', name: 'ENTRADA DE BIENES EN PRÉSTAMO' },
        { code: '30', name: 'SALIDA DE BIENES EN PRÉSTAMO' },
        { code: '31', name: 'ENTRADA DE BIENES EN CUSTODIA' },
        { code: '32', name: 'SALIDA DE BIENES EN CUSTODIA' },
        { code: '33', name: 'MUESTRAS MÉDICAS' },
        { code: '34', name: 'PUBLICIDAD' },
        { code: '35', name: 'GASTOS DE REPRESENTACIÓN' },
        { code: '36', name: 'RETIRO PARA ENTREGA A TRABAJADORES' },
        { code: '37', name: 'RETIRO POR CONVENIO COLECTIVO' },
        { code: '38', name: 'RETIRO POR SUSTITUCIÓN DE BIEN SINIESTRADO' },
        { code: '91', name: 'OTROS 1' },
        { code: '92', name: 'OTROS 2' },
        { code: '93', name: 'OTROS 3' },
        { code: '94', name: 'OTROS 4' },
        { code: '95', name: 'OTROS 5' },
        { code: '96', name: 'OTROS 6' },
        { code: '97', name: 'OTROS 7' },
        { code: '98', name: 'OTROS 8' },
        { code: '99', name: 'OTROS' },
      ]
    },
    // Table 14: Método de Valuación
    {
      tableName: 'valuation_method',
      data: [
        { code: '1', name: 'PROMEDIO PONDERADO' },
        { code: '2', name: 'PRIMERAS ENTRADAS, PRIMERAS SALIDAS' },
        { code: '3', name: 'EXISTENCIAS BÁSICAS' },
        { code: '4', name: 'DETALLISTA' },
        { code: '5', name: 'IDENTIFICACIÓN ESPECÍFICA' },
        { code: '9', name: 'OTROS' },
      ]
    },
    // Other tables already present but maybe need checking
    {
      tableName: 'document_type',
      data: [
        { code: '01', name: 'DNI' },
        { code: '06', name: 'RUC' },
        { code: '04', name: 'CARNET EXTRANJERIA' },
        { code: '07', name: 'PASAPORTE' },
        { code: '00', name: 'OTROS' }
      ]
    },
    {
      tableName: 'currency',
      data: [
        { code: 'PEN', name: 'SOLES' },
        { code: 'USD', name: 'DOLARES' }
      ]
    },
    {
      tableName: 'payment_condition',
      data: [
        { code: 'CONTADO', name: 'CONTADO' },
        { code: 'CREDITO', name: 'CREDITO' }
      ]
    }
  ];

  console.log('Iniciando actualización de tablas SUNAT...');

  for (const catalog of catalogs) {
    console.log(`Actualizando tabla: ${catalog.tableName}`);
    for (const item of catalog.data) {
      await prisma.sunatTable.upsert({
        where: {
          tableName_code: {
            tableName: catalog.tableName,
            code: item.code
          }
        },
        update: {
          name: item.name,
          isActive: true
        },
        create: {
          tableName: catalog.tableName,
          code: item.code,
          name: item.name,
          isActive: true
        }
      });
    }
  }

  console.log('Tablas SUNAT actualizadas con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
