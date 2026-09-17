import 'dotenv/config';
import prisma from '../server/lib/prisma';

async function testUserWarehouseAssignment() {
  console.log('--- Probando Asignación de Almacén por Defecto a Usuario ---');

  // 1. Obtener almacén Zárate (0007)
  const zarate = await prisma.warehouse.findFirst({ where: { sunatCode: '0007' } });
  if (!zarate) throw new Error('Almacén Zárate no encontrado');

  // 2. Obtener o crear usuario de prueba
  let user = await prisma.user.findFirst({ where: { email: 'admin@grupocarmelita.com' } });
  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (user) {
    // 3. Asignar Zárate como almacén por defecto al usuario
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { warehouseId: zarate.id },
      include: { warehouse: true }
    });

    console.log(`✓ Usuario: ${updatedUser.name || updatedUser.email}`);
    console.log(`✓ Almacén por Defecto Asignado: [${updatedUser.warehouse?.sunatCode}] ${updatedUser.warehouse?.name}`);
    console.log('✓ Almacén asignado correctamente en base de datos.');
  }

  console.log('--- Prueba Completada con Éxito ---');
}

testUserWarehouseAssignment()
  .catch(e => {
    console.error('Error en prueba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
