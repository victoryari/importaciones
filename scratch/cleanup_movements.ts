
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  console.log('Starting cleanup...');
  
  // 1. Find all movements that look like purchases
  const movements = await prisma.stockMovement.findMany({
    where: {
      observation: {
        contains: 'Compra'
      }
    }
  });

  console.log(`Found ${movements.length} potential purchase movements.`);

  for (const mov of movements) {
    if (mov.purchaseId) continue; // Already linked

    // Extract doc number (e.g. from "Compra 2026-199328" or "Compra (Editada) 2026-199328")
    const match = mov.observation?.match(/(\d+-\d+)/);
    if (match) {
      const docNum = match[1];
      const purchase = await prisma.purchase.findFirst({
        where: { docNumber: docNum }
      });

      if (purchase) {
        console.log(`Linking movement ${mov.id} to purchase ${purchase.id} (Doc: ${docNum})`);
        await prisma.stockMovement.update({
          where: { id: mov.id },
          data: { purchaseId: purchase.id }
        });
      }
    }
  }

  // 2. Now that they are linked, delete duplicates for the same purchase/product
  // Keep only the newest one
  const linkedMovements = await prisma.stockMovement.findMany({
    where: { purchaseId: { not: null } },
    orderBy: { createdAt: 'desc' }
  });

  const seen = new Set();
  for (const mov of linkedMovements) {
    const key = `${mov.purchaseId}-${mov.productId}-${mov.lotNumber || 'no-lot'}`;
    if (seen.has(key)) {
      console.log(`Deleting duplicate movement ${mov.id} for purchase ${mov.purchaseId}`);
      await prisma.stockMovement.delete({ where: { id: mov.id } });
    } else {
      seen.add(key);
    }
  }

  console.log('Cleanup finished.');
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
