import 'dotenv/config';
import prisma from '../server/lib/prisma';

async function uppercaseCustomers() {
  console.log('--- Normalizando Nombres y Direcciones de Clientes a MAYÚSCULAS ---');

  await prisma.customer.update({
    where: { id: 1 },
    data: { address: 'AV. LOS PROCERES S/N - SAN JUAN DE LURIGANCHO - LIMA - LIMA', department: 'LIMA', province: 'LIMA', district: 'SAN JUAN DE LURIGANCHO' }
  });
  await prisma.customer.update({
    where: { id: 15 },
    data: { address: 'JR. AMELIA PINEDO N°4236 - BANDA DE SHILCAYO - TARAPOTO - SAN MARTIN', department: 'SAN MARTIN', province: 'SAN MARTIN', district: 'BANDA DE SHILCAYO' }
  });

  const customers = await prisma.customer.findMany();
  console.log(`Encontrados ${customers.length} clientes en base de datos.`);

  const cleanStr = (s?: string | null) => (s || '').trim().toUpperCase();
  const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalizeDocType = (dt?: string) => {
    if (!dt) return 'DNI';
    const clean = dt.trim().toUpperCase();
    if (clean === '1' || clean === 'DNI') return 'DNI';
    if (clean === '6' || clean === 'RUC') return 'RUC';
    if (clean === '4' || clean === 'CE') return 'CE';
    if (clean === '7' || clean === 'PAS') return 'PAS';
    return clean;
  };

  const formatFullAddressServer = (addr?: string | null, dist?: string | null, prov?: string | null, dept?: string | null) => {
    let a = cleanStr(addr);
    const de = cleanStr(dept);
    const pr = cleanStr(prov);
    const di = cleanStr(dist);

    // Si la dirección base ya tenía partes agregadas previamente, podemos extraer solo la calle base
    let baseStreet = a;
    if (di && baseStreet.includes(` - ${di}`)) baseStreet = baseStreet.replace(new RegExp(`\\s*-\\s*${di}.*$`, 'i'), '');
    if (de && baseStreet.includes(` - ${de}`)) baseStreet = baseStreet.replace(new RegExp(`\\s*-\\s*${de}.*$`, 'i'), '');

    if (!baseStreet) return [de, pr, di].filter(Boolean).join(' - ');

    const normAddr = removeAccents(baseStreet);
    const parts = [baseStreet];
    if (de && !normAddr.includes(removeAccents(de))) parts.push(de);
    if (pr && !normAddr.includes(removeAccents(pr))) parts.push(pr);
    if (di && !normAddr.includes(removeAccents(di))) parts.push(di);
    return parts.join(' - ');
  };

  for (const c of customers) {
    const newName = cleanStr(c.name);
    const newDocType = normalizeDocType(c.docType);
    const newAddress = formatFullAddressServer(c.address, c.district, c.province, c.department);

    if (newName !== c.name || newDocType !== c.docType || newAddress !== c.address) {
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          name: newName,
          docType: newDocType,
          address: newAddress || null
        }
      });
      console.log(`✓ Cliente actualizado [ID ${c.id}]: [${newDocType}] ${newName} | ${newAddress || 'S/D'}`);
    } else {
      console.log(`- Sin cambios [ID ${c.id}]: [${newDocType}] ${newName} | ${newAddress || 'S/D'}`);
    }
  }

  console.log('--- Normalización Completada con Éxito ---');
}

uppercaseCustomers()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
