const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true }
    });
    console.log('Total orders in DB:', orders.length);
    console.log('Latest orders:', JSON.stringify(orders.slice(-3), null, 2));
  } catch (err) {
    console.error('Error checking orders:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrders();
