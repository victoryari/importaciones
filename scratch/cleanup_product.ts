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
  const code = 'BA14-Z002.A'.toLowerCase().trim();
  const products = await prisma.product.findMany({});
  
  const conflictive = products.filter(p => 
    (p.code && p.code.toLowerCase().trim() === code) || 
    (p.slug && p.slug.toLowerCase().trim() === code)
  );

  if (conflictive.length > 0) {
    console.log(`Encontrados ${conflictive.length} productos conflictivos.`);
    for (const p of conflictive) {
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`Producto eliminado: ID ${p.id}, Nombre: ${p.name}, Código: ${p.code}, Slug: ${p.slug}`);
    }
  } else {
    console.log("No se encontraron conflictos exactos.");
    // Search for partial matches just in case
    const partial = products.filter(p => 
      (p.code && p.code.toLowerCase().includes('ba14-z002')) || 
      (p.slug && p.slug.toLowerCase().includes('ba14-z002'))
    );
    if (partial.length > 0) {
      console.log("Se encontraron coincidencias parciales:");
      console.log(JSON.stringify(partial, null, 2));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
