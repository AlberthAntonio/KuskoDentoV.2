const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// En Prisma 5, esto funciona perfecto porque lee el .env automáticamente
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed con Prisma 6...');

  const clinic = await prisma.clinic.upsert({
    where: { domain: 'demo.local' },
    update: {},
    create: {
      name: 'Demo Clinic',
      domain: 'demo.local',
      subscription_status: 'active',
      subscription_tier: 'basic',
    },
  });

  const hash = await bcrypt.hash('Admin12345', 12);

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {
      clinic_id: clinic.id,
      password_hash: hash,
      role: 'admin',
    },
    create: {
      clinic_id: clinic.id,
      email: 'admin@demo.com',
      username: 'admin_demo',
      password_hash: hash,
      status: 'active',
      role: 'admin',
      full_name: 'Administrador General',
    },
  });

  console.log('✅ SEED COMPLETADO');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });