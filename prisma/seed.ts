import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

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
  const email = 'admin@carmelita.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: 'Administrador',
    },
  });

  console.log(`User created: ${user.email}`);
  console.log(`Password: ${password}`);

  // Tipos de documento para series (DocumentType)
  const docTypes = [
    { code: 'COT', name: 'COTIZACIÓN' },
    { code: 'PED', name: 'PEDIDO' },
    { code: '01', name: 'FACTURA' },
    { code: '03', name: 'BOLETA' },
    { code: '09', name: 'GUÍA DE REMISIÓN' },
    { code: '07', name: 'NOTA DE CRÉDITO' },
    { code: '08', name: 'NOTA DE DÉBITO' },
  ];

  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      update: { name: dt.name },
      create: dt,
    });
  }
  console.log(`Seeded ${docTypes.length} document types`);

  // --- CATALOGOS SUNAT - ANEXO 3 (Libros y Registros Electrónicos) ---
  await prisma.sunatTable.deleteMany({});

  const sunatCatalogs = [

    // TABLA 1: TIPO DE MEDIO DE PAGO
    { tableName: 'TABLA_01', code: '001', name: 'Depósito en cuenta' },
    { tableName: 'TABLA_01', code: '002', name: 'Giro' },
    { tableName: 'TABLA_01', code: '003', name: 'Transferencia de fondos' },
    { tableName: 'TABLA_01', code: '004', name: 'Orden de pago' },
    { tableName: 'TABLA_01', code: '005', name: 'Tarjeta de débito' },
    { tableName: 'TABLA_01', code: '006', name: 'Tarjeta de crédito emitida en el país' },
    { tableName: 'TABLA_01', code: '007', name: 'Cheques con cláusula de no negociable' },
    { tableName: 'TABLA_01', code: '008', name: 'Efectivo (sin obligación de usar medio de pago)' },
    { tableName: 'TABLA_01', code: '009', name: 'Efectivo (en los demás casos)' },
    { tableName: 'TABLA_01', code: '010', name: 'Medios de pago de comercio exterior' },
    { tableName: 'TABLA_01', code: '011', name: 'Documentos emitidos por las EDPYMES' },
    { tableName: 'TABLA_01', code: '012', name: 'Tarjeta de crédito emitida en el exterior' },
    { tableName: 'TABLA_01', code: '101', name: 'Transferencia - Carta de crédito (comercio exterior)' },
    { tableName: 'TABLA_01', code: '102', name: 'Cobranza bancaria (comercio exterior)' },

    // TABLA 2: TIPO DE DOCUMENTO DE IDENTIDAD
    { tableName: 'TABLA_02', code: '0', name: 'Otros tipos de documentos' },
    { tableName: 'TABLA_02', code: '1', name: 'DNI - Documento Nacional de Identidad' },
    { tableName: 'TABLA_02', code: '4', name: 'Carnet de Extranjería' },
    { tableName: 'TABLA_02', code: '6', name: 'RUC - Registro Único de Contribuyentes' },
    { tableName: 'TABLA_02', code: '7', name: 'Pasaporte' },
    { tableName: 'TABLA_02', code: 'A', name: 'Cédula diplomática de identidad' },
    { tableName: 'TABLA_02', code: 'B', name: 'Doc. de identidad de países de la CAN' },

    // TABLA 3: ENTIDAD FINANCIERA
    { tableName: 'TABLA_03', code: '001', name: 'BANCO DE CRÉDITO DEL PERÚ' },
    { tableName: 'TABLA_03', code: '002', name: 'BANCO CONTINENTAL (BBVA)' },
    { tableName: 'TABLA_03', code: '003', name: 'BANCO SCOTIABANK PERÚ' },
    { tableName: 'TABLA_03', code: '004', name: 'INTERBANK' },
    { tableName: 'TABLA_03', code: '005', name: 'BANCO DE LA NACIÓN' },
    { tableName: 'TABLA_03', code: '006', name: 'BANCO PICHINCHA' },
    { tableName: 'TABLA_03', code: '007', name: 'MIBANCO' },
    { tableName: 'TABLA_03', code: '008', name: 'BANCO GNB PERÚ' },
    { tableName: 'TABLA_03', code: '009', name: 'BANCO FALABELLA' },
    { tableName: 'TABLA_03', code: '010', name: 'BANCO RIPLEY' },
    { tableName: 'TABLA_03', code: '011', name: 'BANCO BANBIF' },
    { tableName: 'TABLA_03', code: '012', name: 'BANCO SANTANDER PERÚ' },
    { tableName: 'TABLA_03', code: '099', name: 'OTRAS ENTIDADES FINANCIERAS' },

    // TABLA 4: TIPO DE MONEDA
    { tableName: 'TABLA_04', code: 'PEN', name: 'Soles (Nuevos Soles)' },
    { tableName: 'TABLA_04', code: 'USD', name: 'Dólares Americanos' },
    { tableName: 'TABLA_04', code: 'EUR', name: 'Euros' },
    { tableName: 'TABLA_04', code: 'GBP', name: 'Libras Esterlinas' },
    { tableName: 'TABLA_04', code: 'JPY', name: 'Yenes Japoneses' },
    { tableName: 'TABLA_04', code: 'CHF', name: 'Franco Suizo' },
    { tableName: 'TABLA_04', code: 'CAD', name: 'Dólar Canadiense' },
    { tableName: 'TABLA_04', code: 'CNY', name: 'Yuan Chino (Renminbi)' },
    { tableName: 'TABLA_04', code: 'BRL', name: 'Real Brasileño' },
    { tableName: 'TABLA_04', code: 'CLP', name: 'Peso Chileno' },
    { tableName: 'TABLA_04', code: 'COP', name: 'Peso Colombiano' },
    { tableName: 'TABLA_04', code: 'MXN', name: 'Peso Mexicano' },

    // TABLA 5: TIPO DE EXISTENCIA
    { tableName: 'TABLA_05', code: '01', name: 'Mercaderías' },
    { tableName: 'TABLA_05', code: '02', name: 'Productos terminados' },
    { tableName: 'TABLA_05', code: '03', name: 'Materias primas' },
    { tableName: 'TABLA_05', code: '04', name: 'Envases y embalajes' },
    { tableName: 'TABLA_05', code: '05', name: 'Suministros diversos' },
    { tableName: 'TABLA_05', code: '06', name: 'Productos en proceso' },
    { tableName: 'TABLA_05', code: '07', name: 'Subproductos, desechos y desperdicios' },
    { tableName: 'TABLA_05', code: '08', name: 'Existencias de servicios en proceso' },
    { tableName: 'TABLA_05', code: '09', name: 'Activos no corrientes disponibles para la venta' },
    { tableName: 'TABLA_05', code: '99', name: 'Otros' },

    // TABLA 6: CÓDIGO DE LA UNIDAD DE MEDIDA
    { tableName: 'TABLA_06', code: 'NIU', name: 'Unidad (bienes)' },
    { tableName: 'TABLA_06', code: 'ZZ', name: 'Unidad (servicios)' },
    { tableName: 'TABLA_06', code: 'KGM', name: 'Kilogramo' },
    { tableName: 'TABLA_06', code: 'GRM', name: 'Gramo' },
    { tableName: 'TABLA_06', code: 'TNE', name: 'Tonelada métrica' },
    { tableName: 'TABLA_06', code: 'LTR', name: 'Litro' },
    { tableName: 'TABLA_06', code: 'MLT', name: 'Mililitro' },
    { tableName: 'TABLA_06', code: 'MTR', name: 'Metro' },
    { tableName: 'TABLA_06', code: 'CMT', name: 'Centímetro' },
    { tableName: 'TABLA_06', code: 'MMT', name: 'Milímetro' },
    { tableName: 'TABLA_06', code: 'MTK', name: 'Metro cuadrado' },
    { tableName: 'TABLA_06', code: 'MTQ', name: 'Metro cúbico' },
    { tableName: 'TABLA_06', code: 'BX', name: 'Caja' },
    { tableName: 'TABLA_06', code: 'PK', name: 'Paquete' },
    { tableName: 'TABLA_06', code: 'DZN', name: 'Docena' },
    { tableName: 'TABLA_06', code: 'GLL', name: 'Galón' },
    { tableName: 'TABLA_06', code: 'BLL', name: 'Barril' },
    { tableName: 'TABLA_06', code: 'SET', name: 'Juego / Set' },
    { tableName: 'TABLA_06', code: 'PR', name: 'Par' },
    { tableName: 'TABLA_06', code: 'HUR', name: 'Hora' },
    { tableName: 'TABLA_06', code: 'DAY', name: 'Día' },
    { tableName: 'TABLA_06', code: 'MON', name: 'Mes' },
    { tableName: 'TABLA_06', code: '4A', name: 'Bobina' },
    { tableName: 'TABLA_06', code: 'LBR', name: 'Libra' },
    { tableName: 'TABLA_06', code: 'ONZ', name: 'Onza' },

    // TABLA 10: TIPO DE COMPROBANTE DE PAGO O DOCUMENTO
    { tableName: 'TABLA_10', code: '00', name: 'Otros' },
    { tableName: 'TABLA_10', code: '01', name: 'Factura' },
    { tableName: 'TABLA_10', code: '02', name: 'Recibo por Honorarios' },
    { tableName: 'TABLA_10', code: '03', name: 'Boleta de Venta' },
    { tableName: 'TABLA_10', code: '04', name: 'Liquidación de Compra' },
    { tableName: 'TABLA_10', code: '05', name: 'Boleto de compañía de aviación' },
    { tableName: 'TABLA_10', code: '06', name: 'Carta de porte aéreo (carga)' },
    { tableName: 'TABLA_10', code: '07', name: 'Nota de Crédito' },
    { tableName: 'TABLA_10', code: '08', name: 'Nota de Débito' },
    { tableName: 'TABLA_10', code: '09', name: 'Guía de Remisión Remitente' },
    { tableName: 'TABLA_10', code: '10', name: 'Recibo por Arrendamiento' },
    { tableName: 'TABLA_10', code: '11', name: 'Póliza emitida por bolsa de valores' },
    { tableName: 'TABLA_10', code: '12', name: 'Ticket o cinta emitido por máquina registradora' },
    { tableName: 'TABLA_10', code: '13', name: 'Doc. emitido por sistema banca/finanzas' },
    { tableName: 'TABLA_10', code: '14', name: 'Recibo de Servicios Públicos' },
    { tableName: 'TABLA_10', code: '18', name: 'Documentos emitidos por las AFP' },
    { tableName: 'TABLA_10', code: '19', name: 'Boleto - Pasaje expedido por transporte' },
    { tableName: 'TABLA_10', code: '23', name: 'Factura - Carta de crédito negociable' },
    { tableName: 'TABLA_10', code: '31', name: 'Guía de Remisión Transportista' },
    { tableName: 'TABLA_10', code: '50', name: 'Declaración Única de Aduanas (importación)' },
    { tableName: 'TABLA_10', code: '52', name: 'Despacho simplificado de importación' },
    { tableName: 'TABLA_10', code: '91', name: 'Comprobante de No Domiciliado' },
    { tableName: 'TABLA_10', code: '97', name: 'Nota de Crédito No Domiciliado' },
    { tableName: 'TABLA_10', code: '98', name: 'Nota de Débito No Domiciliado' },
    { tableName: 'TABLA_10', code: '99', name: 'Consolidado de Boletas de Venta' },

    // TABLA 11: CÓDIGO DE LA ADUANA
    { tableName: 'TABLA_11', code: '019', name: 'Tumbes' },
    { tableName: 'TABLA_11', code: '028', name: 'Talara' },
    { tableName: 'TABLA_11', code: '046', name: 'Paita' },
    { tableName: 'TABLA_11', code: '055', name: 'Chiclayo' },
    { tableName: 'TABLA_11', code: '082', name: 'Salaverry' },
    { tableName: 'TABLA_11', code: '091', name: 'Chimbote' },
    { tableName: 'TABLA_11', code: '118', name: 'Marítima del Callao' },
    { tableName: 'TABLA_11', code: '127', name: 'Aérea y Postal del Callao' },
    { tableName: 'TABLA_11', code: '136', name: 'Pisco' },
    { tableName: 'TABLA_11', code: '145', name: 'Mollendo - Matarani' },
    { tableName: 'TABLA_11', code: '154', name: 'Arequipa' },
    { tableName: 'TABLA_11', code: '163', name: 'Ilo' },
    { tableName: 'TABLA_11', code: '172', name: 'Tacna' },
    { tableName: 'TABLA_11', code: '181', name: 'Santa Rosa (Desaguadero)' },
    { tableName: 'TABLA_11', code: '190', name: 'Puno' },
    { tableName: 'TABLA_11', code: '208', name: 'Cusco' },
    { tableName: 'TABLA_11', code: '217', name: 'Iquitos' },

    // TABLA 12: TIPO DE OPERACIÓN
    { tableName: 'TABLA_12', code: '01', name: 'Venta' },
    { tableName: 'TABLA_12', code: '02', name: 'Compra' },
    { tableName: 'TABLA_12', code: '03', name: 'Consignación recibida' },
    { tableName: 'TABLA_12', code: '04', name: 'Consignación entregada' },
    { tableName: 'TABLA_12', code: '05', name: 'Devolución recibida' },
    { tableName: 'TABLA_12', code: '06', name: 'Devolución entregada' },
    { tableName: 'TABLA_12', code: '07', name: 'Bonificación / Promoción' },
    { tableName: 'TABLA_12', code: '08', name: 'Premio' },
    { tableName: 'TABLA_12', code: '09', name: 'Donación' },
    { tableName: 'TABLA_12', code: '10', name: 'Salida a producción' },
    { tableName: 'TABLA_12', code: '11', name: 'Transferencia entre almacenes' },
    { tableName: 'TABLA_12', code: '12', name: 'Retiro' },
    { tableName: 'TABLA_12', code: '13', name: 'Mermas' },
    { tableName: 'TABLA_12', code: '14', name: 'Desmedros' },
    { tableName: 'TABLA_12', code: '15', name: 'Destrucción' },
    { tableName: 'TABLA_12', code: '16', name: 'Saldo inicial' },
    { tableName: 'TABLA_12', code: '99', name: 'Otros' },

    // TABLA 13: CATÁLOGO DE EXISTENCIAS
    { tableName: 'TABLA_13', code: '001', name: 'Mercaderías' },
    { tableName: 'TABLA_13', code: '002', name: 'Productos terminados' },
    { tableName: 'TABLA_13', code: '003', name: 'Subproductos y desechos' },
    { tableName: 'TABLA_13', code: '004', name: 'Materias primas' },
    { tableName: 'TABLA_13', code: '005', name: 'Materiales auxiliares, suministros y repuestos' },
    { tableName: 'TABLA_13', code: '006', name: 'Envases y embalajes' },
    { tableName: 'TABLA_13', code: '007', name: 'Existencias por recibir' },
    { tableName: 'TABLA_13', code: '008', name: 'Existencias en tránsito' },
    { tableName: 'TABLA_13', code: '009', name: 'Productos en proceso' },
    { tableName: 'TABLA_13', code: '099', name: 'Otras existencias' },

    // TABLA 14: MÉTODO DE VALUACIÓN
    { tableName: 'TABLA_14', code: '1', name: 'Promedio Ponderado' },
    { tableName: 'TABLA_14', code: '2', name: 'PEPS - Primeras Entradas, Primeras Salidas' },
    { tableName: 'TABLA_14', code: '3', name: 'Existencias Básicas' },
    { tableName: 'TABLA_14', code: '4', name: 'Detallista' },
    { tableName: 'TABLA_14', code: '5', name: 'Identificación Específica' },
    { tableName: 'TABLA_14', code: '9', name: 'Otros' },

    // TABLA 15: TIPO DE TÍTULO
    { tableName: 'TABLA_15', code: '01', name: 'Acciones' },
    { tableName: 'TABLA_15', code: '02', name: 'Participaciones' },
    { tableName: 'TABLA_15', code: '03', name: 'Bonos' },
    { tableName: 'TABLA_15', code: '04', name: 'Papeles comerciales' },
    { tableName: 'TABLA_15', code: '05', name: 'Letras hipotecarias' },
    { tableName: 'TABLA_15', code: '06', name: 'Cédulas hipotecarias' },
    { tableName: 'TABLA_15', code: '07', name: 'Títulos de deuda externa' },
    { tableName: 'TABLA_15', code: '99', name: 'Otros' },

    // TABLA 16: TIPO DE ACCIONES O PARTICIPACIONES
    { tableName: 'TABLA_16', code: '01', name: 'Acciones con derecho a voto' },
    { tableName: 'TABLA_16', code: '02', name: 'Acciones sin derecho a voto' },
    { tableName: 'TABLA_16', code: '03', name: 'Participaciones' },
    { tableName: 'TABLA_16', code: '04', name: 'Otros' },

    // TABLA 17: PLAN DE CUENTAS
    { tableName: 'TABLA_17', code: '1', name: 'Plan Contable General Empresarial (PCGE)' },
    { tableName: 'TABLA_17', code: '2', name: 'Plan de Cuentas para Empresas del Sistema Financiero (SBS)' },
    { tableName: 'TABLA_17', code: '3', name: 'Plan de Cuentas para Empresas de Seguros (SBS)' },
    { tableName: 'TABLA_17', code: '4', name: 'Plan de Cuentas para AFP (SBS)' },
    { tableName: 'TABLA_17', code: '5', name: 'Plan de Cuentas para Cooperativas de Ahorro y Crédito' },
    { tableName: 'TABLA_17', code: '6', name: 'Manual de Contabilidad para Gobiernos Locales' },
    { tableName: 'TABLA_17', code: '7', name: 'Instructivo de Contabilidad para Sector Público (MEF)' },
    { tableName: 'TABLA_17', code: '9', name: 'Otros' },

    // TABLA 18: TIPO DE ACTIVO FIJO
    { tableName: 'TABLA_18', code: '01', name: 'Con revaluación voluntaria - con efecto tributario' },
    { tableName: 'TABLA_18', code: '02', name: 'Con revaluación voluntaria - sin efecto tributario' },
    { tableName: 'TABLA_18', code: '03', name: 'Sin revaluación' },

    // TABLA 19: ESTADO DEL ACTIVO FIJO
    { tableName: 'TABLA_19', code: '01', name: 'Activo en uso' },
    { tableName: 'TABLA_19', code: '02', name: 'Activo temporalmente fuera de uso' },
    { tableName: 'TABLA_19', code: '03', name: 'Activo obsoleto - fuera de uso' },
    { tableName: 'TABLA_19', code: '04', name: 'Activo cedido a terceros' },
    { tableName: 'TABLA_19', code: '05', name: 'Activo en etapa de construcción o instalación' },
    { tableName: 'TABLA_19', code: '06', name: 'Activo dado de baja por deterioro' },
    { tableName: 'TABLA_19', code: '99', name: 'Otros' },

    // TABLA 20: MÉTODO DE DEPRECIACIÓN
    { tableName: 'TABLA_20', code: '01', name: 'Línea recta' },
    { tableName: 'TABLA_20', code: '02', name: 'Unidades de producción' },
    { tableName: 'TABLA_20', code: '03', name: 'Suma de los dígitos' },
    { tableName: 'TABLA_20', code: '04', name: 'Porcentaje fijo sobre valor decreciente' },
    { tableName: 'TABLA_20', code: '99', name: 'Otros' },

    // TABLA 21: CÓDIGO DE AGRUPAMIENTO DEL COSTO DE PRODUCCIÓN
    { tableName: 'TABLA_21', code: '01', name: 'Materiales directos' },
    { tableName: 'TABLA_21', code: '02', name: 'Mano de obra directa' },
    { tableName: 'TABLA_21', code: '03', name: 'Gastos indirectos de fabricación' },
    { tableName: 'TABLA_21', code: '04', name: 'Productos en proceso - Inicio del período' },
    { tableName: 'TABLA_21', code: '05', name: 'Productos terminados - Inicio del período' },

    // TABLA 22: CATÁLOGO DE ESTADOS FINANCIEROS
    { tableName: 'TABLA_22', code: '01', name: 'Estado de Situación Financiera (Balance General)' },
    { tableName: 'TABLA_22', code: '02', name: 'Estado de Resultados Integrales' },
    { tableName: 'TABLA_22', code: '03', name: 'Estado de Cambios en el Patrimonio Neto' },
    { tableName: 'TABLA_22', code: '04', name: 'Estado de Flujos de Efectivo' },

    // TABLA 25: CONVENIOS PARA EVITAR LA DOBLE TRIBUTACIÓN
    { tableName: 'TABLA_25', code: '01', name: 'Chile' },
    { tableName: 'TABLA_25', code: '02', name: 'Canadá' },
    { tableName: 'TABLA_25', code: '03', name: 'Brasil' },
    { tableName: 'TABLA_25', code: '04', name: 'Ecuador (Decisión 578 - CAN)' },
    { tableName: 'TABLA_25', code: '05', name: 'Colombia (Decisión 578 - CAN)' },
    { tableName: 'TABLA_25', code: '06', name: 'Bolivia (Decisión 578 - CAN)' },
    { tableName: 'TABLA_25', code: '07', name: 'Portugal' },
    { tableName: 'TABLA_25', code: '08', name: 'Suiza' },
    { tableName: 'TABLA_25', code: '09', name: 'México' },
    { tableName: 'TABLA_25', code: '10', name: 'Corea del Sur' },
    { tableName: 'TABLA_25', code: '11', name: 'España' },
    { tableName: 'TABLA_25', code: '00', name: 'Sin convenio' },

    // TABLA 27: TIPO DE VINCULACIÓN ECONÓMICA
    { tableName: 'TABLA_27', code: '01', name: 'Una empresa posee más del 30% de capital de otra' },
    { tableName: 'TABLA_27', code: '02', name: 'Más del 30% capital es poseído por tercero' },
    { tableName: 'TABLA_27', code: '03', name: 'Tienen funcionarios de dirección comunes' },
    { tableName: 'TABLA_27', code: '04', name: 'Tienen accionistas de dirección comunes' },
    { tableName: 'TABLA_27', code: '05', name: 'Una empresa controla la administración de otra' },
    { tableName: 'TABLA_27', code: '06', name: 'Existe partes de capital conjunta' },
    { tableName: 'TABLA_27', code: '07', name: 'Consolidación de estados financieros' },
    { tableName: 'TABLA_27', code: '08', name: 'Empresas del mismo grupo' },
    { tableName: 'TABLA_27', code: '09', name: 'Vínculo por cónyuge o parientes hasta 4to grado' },

    // TABLA 28: PATRIMONIO NETO
    { tableName: 'TABLA_28', code: '01', name: 'Capital social' },
    { tableName: 'TABLA_28', code: '02', name: 'Acciones de inversión' },
    { tableName: 'TABLA_28', code: '03', name: 'Capital adicional' },
    { tableName: 'TABLA_28', code: '04', name: 'Excedente de revaluación' },
    { tableName: 'TABLA_28', code: '05', name: 'Reservas' },
    { tableName: 'TABLA_28', code: '06', name: 'Resultados acumulados' },

    // TABLA 30: CLASIFICACIÓN DE BIENES Y SERVICIOS ADQUIRIDOS
    { tableName: 'TABLA_30', code: '1', name: 'Bienes' },
    { tableName: 'TABLA_30', code: '2', name: 'Servicios' },
    { tableName: 'TABLA_30', code: '3', name: 'Contratos de construcción' },
    { tableName: 'TABLA_30', code: '4', name: 'Importaciones' },
    { tableName: 'TABLA_30', code: '5', name: 'Bienes de capital' },
    { tableName: 'TABLA_30', code: '9', name: 'Otros' },

    // TABLA 31: TIPO DE RENTA
    { tableName: 'TABLA_31', code: '1', name: 'Primera categoría - Renta de capital' },
    { tableName: 'TABLA_31', code: '2', name: 'Segunda categoría - Renta de capital' },
    { tableName: 'TABLA_31', code: '3', name: 'Tercera categoría - Renta de empresa' },
    { tableName: 'TABLA_31', code: '4', name: 'Cuarta categoría - Renta de trabajo independiente' },
    { tableName: 'TABLA_31', code: '5', name: 'Quinta categoría - Renta de trabajo dependiente' },

    // TABLA 32: MODALIDAD DEL SERVICIO PRESTADO POR NO DOMICILIADO
    { tableName: 'TABLA_32', code: '01', name: 'Asistencia técnica' },
    { tableName: 'TABLA_32', code: '02', name: 'Servicios de consultoría' },
    { tableName: 'TABLA_32', code: '03', name: 'Cesión en uso de intangibles' },
    { tableName: 'TABLA_32', code: '04', name: 'Servicios de gestión' },
    { tableName: 'TABLA_32', code: '05', name: 'Servicios digitales' },
    { tableName: 'TABLA_32', code: '99', name: 'Otros servicios' },

    // TABLA 33: EXONERACIONES DE OPERACIONES DE NO DOMICILIADOS (Art. 19 LIR)
    { tableName: 'TABLA_33', code: '01', name: 'Rentabilidad en fondos mutuos del exterior' },
    { tableName: 'TABLA_33', code: '02', name: 'Intereses en operaciones de comercio exterior' },
    { tableName: 'TABLA_33', code: '03', name: 'Intereses bonos emitidos por el Estado' },
    { tableName: 'TABLA_33', code: '04', name: 'Ganancias de capital por venta de valores en bolsa' },
    { tableName: 'TABLA_33', code: '99', name: 'Otras exoneraciones' },

    // TABLA 34: CÓDIGO DE LOS RUBROS DE LOS ESTADOS FINANCIEROS
    { tableName: 'TABLA_34', code: '01', name: 'Activo corriente' },
    { tableName: 'TABLA_34', code: '02', name: 'Activo no corriente' },
    { tableName: 'TABLA_34', code: '03', name: 'Pasivo corriente' },
    { tableName: 'TABLA_34', code: '04', name: 'Pasivo no corriente' },
    { tableName: 'TABLA_34', code: '05', name: 'Patrimonio neto' },
    { tableName: 'TABLA_34', code: '06', name: 'Ingresos de actividades ordinarias' },
    { tableName: 'TABLA_34', code: '07', name: 'Costo de ventas' },
    { tableName: 'TABLA_34', code: '08', name: 'Gastos operativos' },
    { tableName: 'TABLA_34', code: '09', name: 'Otros ingresos y gastos' },

    // TABLA 35: PAÍSES (selección de principales)
    { tableName: 'TABLA_35', code: '9023', name: 'Alemania' },
    { tableName: 'TABLA_35', code: '9063', name: 'Argentina' },
    { tableName: 'TABLA_35', code: '9075', name: 'Australia' },
    { tableName: 'TABLA_35', code: '9076', name: 'Austria' },
    { tableName: 'TABLA_35', code: '9086', name: 'Bélgica' },
    { tableName: 'TABLA_35', code: '9105', name: 'Brasil' },
    { tableName: 'TABLA_35', code: '9117', name: 'Canadá' },
    { tableName: 'TABLA_35', code: '9130', name: 'Chile' },
    { tableName: 'TABLA_35', code: '9134', name: 'China' },
    { tableName: 'TABLA_35', code: '9141', name: 'Colombia' },
    { tableName: 'TABLA_35', code: '9147', name: 'Corea del Sur' },
    { tableName: 'TABLA_35', code: '9155', name: 'Cuba' },
    { tableName: 'TABLA_35', code: '9161', name: 'Ecuador' },
    { tableName: 'TABLA_35', code: '9166', name: 'Egipto' },
    { tableName: 'TABLA_35', code: '9170', name: 'España' },
    { tableName: 'TABLA_35', code: '9172', name: 'Estados Unidos' },
    { tableName: 'TABLA_35', code: '9175', name: 'Francia' },
    { tableName: 'TABLA_35', code: '9190', name: 'Italia' },
    { tableName: 'TABLA_35', code: '9195', name: 'Japón' },
    { tableName: 'TABLA_35', code: '9213', name: 'México' },
    { tableName: 'TABLA_35', code: '9249', name: 'Países Bajos (Holanda)' },
    { tableName: 'TABLA_35', code: '9256', name: 'Panamá' },
    { tableName: 'TABLA_35', code: '9261', name: 'Paraguay' },
    { tableName: 'TABLA_35', code: '9262', name: 'Perú' },
    { tableName: 'TABLA_35', code: '9264', name: 'Portugal' },
    { tableName: 'TABLA_35', code: '9269', name: 'Reino Unido' },
    { tableName: 'TABLA_35', code: '9277', name: 'Rusia' },
    { tableName: 'TABLA_35', code: '9289', name: 'Suiza' },
    { tableName: 'TABLA_35', code: '9297', name: 'Uruguay' },
    { tableName: 'TABLA_35', code: '9303', name: 'Venezuela' },
    { tableName: 'TABLA_35', code: '9999', name: 'Otros países' },
  ];

  for (const cat of sunatCatalogs) {
    await prisma.sunatTable.create({ data: cat });
  }
  console.log(`Seeded ${sunatCatalogs.length} SUNAT Anexo 3 entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  
  const sunatCatalogs = [

    // TABLA 1: TIPO DE MEDIO DE PAGO
    { tableName: 'TABLA_01', code: '001', name: 'Depósito en cuenta' },
    { tableName: 'TABLA_01', code: '002', name: 'Giro' },
    { tableName: 'TABLA_01', code: '003', name: 'Transferencia de fondos' },
    { tableName: 'TABLA_01', code: '004', name: 'Orden de pago' },
    { tableName: 'TABLA_01', code: '005', name: 'Tarjeta de débito' },
    { tableName: 'TABLA_01', code: '006', name: 'Tarjeta de crédito emitida en el país' },
    { tableName: 'TABLA_01', code: '007', name: 'Cheques con cláusula de no negociable' },
    { tableName: 'TABLA_01', code: '008', name: 'Efectivo (sin obligación de medio de pago)' },
    { tableName: 'TABLA_01', code: '009', name: 'Efectivo (en los demás casos)' },
    { tableName: 'TABLA_01', code: '010', name: 'Medios de pago de comercio exterior' },
    { tableName: 'TABLA_01', code: '011', name: 'Documentos emitidos por las EDPYMES' },
    { tableName: 'TABLA_01', code: '012', name: 'Tarjeta de crédito emitida en el exterior' },
    { tableName: 'TABLA_01', code: '101', name: 'Transferencia - Carta de crédito (comercio exterior)' },
    { tableName: 'TABLA_01', code: '102', name: 'Cobranza bancaria (comercio exterior)' },

    // TABLA 2: TIPO DE DOCUMENTO DE IDENTIDAD
    { tableName: 'TABLA_02', code: '0', name: 'Otros tipos de documentos' },
    { tableName: 'TABLA_02', code: '1', name: 'DNI - Documento Nacional de Identidad' },
    { tableName: 'TABLA_02', code: '4', name: 'Carnet de Extranjería' },
    { tableName: 'TABLA_02', code: '6', name: 'RUC - Registro Único de Contribuyentes' },
    { tableName: 'TABLA_02', code: '7', name: 'Pasaporte' },
    { tableName: 'TABLA_02', code: 'A', name: 'Cédula diplomática de identidad' },
    { tableName: 'TABLA_02', code: 'B', name: 'Doc. de identidad de países de la CAN' },

    // TABLA 3: ENTIDAD FINANCIERA
    { tableName: 'TABLA_03', code: '001', name: 'BANCO DE CRÉDITO DEL PERÚ' },
    { tableName: 'TABLA_03', code: '002', name: 'BANCO CONTINENTAL (BBVA)' },
    { tableName: 'TABLA_03', code: '003', name: 'BANCO SCOTIABANK PERÚ' },
    { tableName: 'TABLA_03', code: '004', name: 'INTERBANK' },
    { tableName: 'TABLA_03', code: '005', name: 'BANCO DE LA NACIÓN' },
    { tableName: 'TABLA_03', code: '006', name: 'BANCO PICHINCHA' },
    { tableName: 'TABLA_03', code: '007', name: 'MIBANCO' },
    { tableName: 'TABLA_03', code: '008', name: 'BANCO GNB PERÚ' },
    { tableName: 'TABLA_03', code: '009', name: 'BANCO FALABELLA' },
    { tableName: 'TABLA_03', code: '010', name: 'BANCO RIPLEY' },
    { tableName: 'TABLA_03', code: '099', name: 'OTRAS ENTIDADES FINANCIERAS' },

    // TABLA 4: TIPO DE MONEDA
    { tableName: 'TABLA_04', code: 'PEN', name: 'Soles (Nuevos Soles)' },
    { tableName: 'TABLA_04', code: 'USD', name: 'Dólares Americanos' },
    { tableName: 'TABLA_04', code: 'EUR', name: 'Euros' },
    { tableName: 'TABLA_04', code: 'GBP', name: 'Libras Esterlinas' },
    { tableName: 'TABLA_04', code: 'JPY', name: 'Yenes Japoneses' },
    { tableName: 'TABLA_04', code: 'CNY', name: 'Yuan Chino' },

    // TABLA 5: TIPO DE EXISTENCIA
    { tableName: 'TABLA_05', code: '01', name: 'Mercaderías' },
    { tableName: 'TABLA_05', code: '02', name: 'Productos terminados' },
    { tableName: 'TABLA_05', code: '03', name: 'Materias primas' },
    { tableName: 'TABLA_05', code: '04', name: 'Envases y embalajes' },
    { tableName: 'TABLA_05', code: '05', name: 'Suministros diversos' },
    { tableName: 'TABLA_05', code: '06', name: 'Productos en proceso' },
    { tableName: 'TABLA_05', code: '07', name: 'Subproductos, desechos y desperdicios' },
    { tableName: 'TABLA_05', code: '08', name: 'Existencias de servicios en proceso' },
    { tableName: 'TABLA_05', code: '09', name: 'Activos no corrientes disponibles para la venta' },
    { tableName: 'TABLA_05', code: '99', name: 'Otros' },

    // TABLA 6: CÓDIGO DE LA UNIDAD DE MEDIDA
    { tableName: 'TABLA_06', code: 'NIU', name: 'Unidad (bienes)' },
    { tableName: 'TABLA_06', code: 'ZZ', name: 'Unidad (servicios)' },
    { tableName: 'TABLA_06', code: 'KGM', name: 'Kilogramo' },
    { tableName: 'TABLA_06', code: 'GRM', name: 'Gramo' },
    { tableName: 'TABLA_06', code: 'LTR', name: 'Litro' },
    { tableName: 'TABLA_06', code: 'MLT', name: 'Mililitro' },
    { tableName: 'TABLA_06', code: 'MTR', name: 'Metro' },
    { tableName: 'TABLA_06', code: 'CMT', name: 'Centímetro' },
    { tableName: 'TABLA_06', code: 'MMT', name: 'Milímetro' },
    { tableName: 'TABLA_06', code: 'MTK', name: 'Metro cuadrado' },
    { tableName: 'TABLA_06', code: 'MTQ', name: 'Metro cúbico' },
    { tableName: 'TABLA_06', code: 'BX', name: 'Caja' },
    { tableName: 'TABLA_06', code: 'PK', name: 'Paquete' },
    { tableName: 'TABLA_06', code: 'DZN', name: 'Docena' },
    { tableName: 'TABLA_06', code: 'GLL', name: 'Galón' },
    { tableName: 'TABLA_06', code: 'BLL', name: 'Barril' },
    { tableName: 'TABLA_06', code: 'TNE', name: 'Tonelada métrica' },
    { tableName: 'TABLA_06', code: 'SET', name: 'Juego / Set' },
    { tableName: 'TABLA_06', code: 'PR', name: 'Par' },
    { tableName: 'TABLA_06', code: 'HUR', name: 'Hora' },
    { tableName: 'TABLA_06', code: 'DAY', name: 'Día' },
    { tableName: 'TABLA_06', code: 'MON', name: 'Mes' },

    // TABLA 10: TIPO DE COMPROBANTE DE PAGO O DOCUMENTO
    { tableName: 'TABLA_10', code: '00', name: 'Otros' },
    { tableName: 'TABLA_10', code: '01', name: 'Factura' },
    { tableName: 'TABLA_10', code: '02', name: 'Recibo por Honorarios' },
    { tableName: 'TABLA_10', code: '03', name: 'Boleta de Venta' },
    { tableName: 'TABLA_10', code: '04', name: 'Liquidación de Compra' },
    { tableName: 'TABLA_10', code: '05', name: 'Boleto de compañía de aviación' },
    { tableName: 'TABLA_10', code: '06', name: 'Carta de porte aéreo (carga)' },
    { tableName: 'TABLA_10', code: '07', name: 'Nota de Crédito' },
    { tableName: 'TABLA_10', code: '08', name: 'Nota de Débito' },
    { tableName: 'TABLA_10', code: '09', name: 'Guía de Remisión Remitente' },
    { tableName: 'TABLA_10', code: '10', name: 'Recibo por Arrendamiento' },
    { tableName: 'TABLA_10', code: '11', name: 'Póliza emitida por bolsa de valores' },
    { tableName: 'TABLA_10', code: '12', name: 'Ticket o cinta emitido por máquina registradora' },
    { tableName: 'TABLA_10', code: '13', name: 'Doc. emitido por sistema banca/finanzas' },
    { tableName: 'TABLA_10', code: '14', name: 'Recibo de Servicios Públicos' },
    { tableName: 'TABLA_10', code: '18', name: 'Documentos emitidos por las AFP' },
    { tableName: 'TABLA_10', code: '19', name: 'Boleto - Pasaje expedido por transporte' },
    { tableName: 'TABLA_10', code: '23', name: 'Factura Electrónica (desde Octubre 2010)' },
    { tableName: 'TABLA_10', code: '31', name: 'Guía de Remisión Transportista' },
    { tableName: 'TABLA_10', code: '50', name: 'Declaración Única de Aduanas (importación)' },
    { tableName: 'TABLA_10', code: '52', name: 'Despacho simplificado de importación' },
    { tableName: 'TABLA_10', code: '91', name: 'Comprobante de No Domiciliado' },
    { tableName: 'TABLA_10', code: '97', name: 'Nota de Crédito No Domiciliado' },
    { tableName: 'TABLA_10', code: '98', name: 'Nota de Débito No Domiciliado' },
    { tableName: 'TABLA_10', code: '99', name: 'Consolidado de Boletas de Venta' },

    // TABLA 12: TIPO DE OPERACIÓN (Control de Inventarios)
    { tableName: 'TABLA_12', code: '01', name: 'Venta' },
    { tableName: 'TABLA_12', code: '02', name: 'Compra' },
    { tableName: 'TABLA_12', code: '03', name: 'Consignación recibida' },
    { tableName: 'TABLA_12', code: '04', name: 'Consignación entregada' },
    { tableName: 'TABLA_12', code: '05', name: 'Devolución recibida' },
    { tableName: 'TABLA_12', code: '06', name: 'Devolución entregada' },
    { tableName: 'TABLA_12', code: '07', name: 'Bonificación / Promoción' },
    { tableName: 'TABLA_12', code: '08', name: 'Premio' },
    { tableName: 'TABLA_12', code: '09', name: 'Donación' },
    { tableName: 'TABLA_12', code: '10', name: 'Salida a producción' },
    { tableName: 'TABLA_12', code: '11', name: 'Transferencia entre almacenes' },
    { tableName: 'TABLA_12', code: '12', name: 'Retiro' },
    { tableName: 'TABLA_12', code: '13', name: 'Mermas' },
    { tableName: 'TABLA_12', code: '14', name: 'Desmedros' },
    { tableName: 'TABLA_12', code: '15', name: 'Destrucción' },
    { tableName: 'TABLA_12', code: '16', name: 'Saldo inicial' },
    { tableName: 'TABLA_12', code: '99', name: 'Otros' },

    // CATÁLOGOS ADICIONALES PARA FACTURACIÓN ELECTRÓNICA (Anexo 8 UBL 2.1)
    // Catálogo 07: Tipos de Afectación del IGV (datos únicos, no duplicados en TABLA_XX)
    { tableName: 'CAT_07', code: '10', name: 'Gravado - Operación Onerosa' },
    { tableName: 'CAT_07', code: '11', name: 'Gravado - Retiro por premio' },
    { tableName: 'CAT_07', code: '12', name: 'Gravado - Retiro por donación' },
    { tableName: 'CAT_07', code: '13', name: 'Gravado - Retiro' },
    { tableName: 'CAT_07', code: '14', name: 'Gravado - Retiro por publicidad' },
    { tableName: 'CAT_07', code: '15', name: 'Gravado - Bonificaciones' },
    { tableName: 'CAT_07', code: '16', name: 'Gravado - Retiro por entrega a trabajadores' },
    { tableName: 'CAT_07', code: '17', name: 'Gravado - IVAP' },
    { tableName: 'CAT_07', code: '20', name: 'Exonerado - Operación Onerosa' },
    { tableName: 'CAT_07', code: '21', name: 'Exonerado - Transferencia gratuita' },
    { tableName: 'CAT_07', code: '30', name: 'Inafecto - Operación Onerosa' },
    { tableName: 'CAT_07', code: '31', name: 'Inafecto - Retiro por Bonificación' },
    { tableName: 'CAT_07', code: '32', name: 'Inafecto - Retiro' },
    { tableName: 'CAT_07', code: '33', name: 'Inafecto - Retiro por Muestras Médicas' },
    { tableName: 'CAT_07', code: '34', name: 'Inafecto - Retiro por Convenio' },
    { tableName: 'CAT_07', code: '35', name: 'Inafecto - Retiro por premio' },
    { tableName: 'CAT_07', code: '36', name: 'Inafecto - Retiro por publicidad' },
    { tableName: 'CAT_07', code: '40', name: 'Exportación' },

    // Catálogo 51: Tipo de Operación (Facturación Electrónica)
    { tableName: 'CAT_51', code: '0101', name: 'Venta Interna' },
    { tableName: 'CAT_51', code: '0102', name: 'Exportación' },
    { tableName: 'CAT_51', code: '0103', name: 'No Domiciliados' },
    { tableName: 'CAT_51', code: '0104', name: 'Venta Interna - Anticipos' },
    { tableName: 'CAT_51', code: '0112', name: 'Venta Interna - Itinerante' },
    { tableName: 'CAT_51', code: '0200', name: 'Compra Nacional' },
    { tableName: 'CAT_51', code: '0201', name: 'Compra Importación' },

    // Condiciones de Pago (interno del sistema)
    { tableName: 'CAT_PAY', code: 'CONTADO', name: 'Contado' },
    { tableName: 'CAT_PAY', code: 'CREDITO', name: 'Crédito' },
  ];

  for (const cat of sunatCatalogs) {
    await prisma.sunatTable.create({ data: cat });
  }
  console.log(`Seeded ${sunatCatalogs.length} SUNAT catalog entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
