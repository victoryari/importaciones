import 'dotenv/config';
import prisma from './server/lib/prisma';

async function updateItems(modelName, relationName, symbolField) {
  console.log(`Updating ${modelName}...`);
  const items = await prisma[modelName].findMany({
    include: {
      product: {
        include: {
          package: true,
          subPackage: true,
          unit: true
        }
      }
    }
  });

  let updatedCount = 0;
  for (const item of items) {
    if (!item.product) continue;
    
    const correctSymbol = item.product.package?.symbol || item.product.subPackage?.symbol || item.product.unit?.symbol || 'UND';
    
    if (item[symbolField] !== correctSymbol) {
      await prisma[modelName].update({
        where: { id: item.id },
        data: { [symbolField]: correctSymbol }
      });
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} records in ${modelName}.`);
}

async function main() {
  try {
    // Quotation items
    await updateItems('quotationItem', 'quotation', 'unitMeasure');
    // Order items
    await updateItems('orderItem', 'order', 'unitMeasure');
    // Invoice items
    await updateItems('invoiceItem', 'invoice', 'unitMeasure');
    // Purchase items (Guías de Remisión de Ingreso y Compras)
    await updateItems('purchaseItem', 'purchase', 'unitSymbol');
    // Warehouse movement items (Asistente y Extracción)
    await updateItems('warehouseMovementItem', 'movement', 'unit');
    // Guide items (Guías de Remisión de Salida)
    await updateItems('guideItem', 'guide', 'unitMeasure');
    
    console.log("All unit measures corrected successfully.");
  } catch (err) {
    console.error("Error updating units:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
