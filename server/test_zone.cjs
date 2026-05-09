const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
require('dotenv').config();

const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const floorId = 1; // Assuming 1ER PISO has ID 1 based on previous output
    const name = "1ER PISO-ZONA A";
    const code = "A1.P1.A";

    const zone = await prisma.warehouseZone.create({
      data: { floorId: floorId, name, code }
    });
    console.log("Success:", zone);
  } catch (e) {
    console.log("Error:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
