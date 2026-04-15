const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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

  const hash = await bcrypt.hash('Demo12345', 12);

  await prisma.user.upsert({
    where: { email: 'demo@clinic.com' },
    update: {
      clinic_id: clinic.id,
      password_hash: hash,
      status: 'active',
      role: 'clinic_owner',
      full_name: 'Demo Owner',
    },
    create: {
      clinic_id: clinic.id,
      email: 'demo@clinic.com',
      password_hash: hash,
      status: 'active',
      role: 'clinic_owner',
      full_name: 'Demo Owner',
    },
  });

  console.log('SEED_OK', clinic.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
