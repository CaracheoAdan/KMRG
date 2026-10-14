import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed de la base de datos...');

  // ── 1. Crear usuario administrador por defecto ──
  const adminEmail = 'admin@kmrg.app';
  const adminPassword = 'Admin12345!';

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`✅ El usuario admin "${adminEmail}" ya existe. Omitiendo creación.`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
      },
    });

    console.log(`✅ Usuario administrador creado:`);
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  Cambia esta contraseña en producción.');
  }

  // ── 2. Mensajes de ejemplo ──
  const messagesCount = await prisma.message.count();
  if (messagesCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          content: '¡Buenos días, mi amor! Hoy es un día especial solo porque existes. ❤️',
          scheduled_date: new Date('2026-10-15'),
          theme_color: '#e63946',
          is_read: false,
        },
        {
          content: 'Cada día a tu lado es un regalo. Gracias por ser tú. 🌹',
          scheduled_date: new Date('2026-10-20'),
          theme_color: '#457b9d',
          is_read: false,
        },
        {
          content: '¿Recuerdas nuestra primera cita? Yo nunca la olvidaré. 🥰',
          scheduled_date: new Date('2026-11-01'),
          theme_color: '#f4a261',
          is_read: false,
        },
      ],
    });
    console.log('✅ 3 mensajes de ejemplo creados.');
  }

  // ── 3. Hitos de ejemplo ──
  const milestonesCount = await prisma.milestone.count();
  if (milestonesCount === 0) {
    await prisma.milestone.createMany({
      data: [
        {
          title: 'Nuestro primer beso',
          date: new Date('2024-02-14'),
          image_url: 'https://placehold.co/600x400?text=Primer+Beso',
        },
        {
          title: 'Primer viaje juntos',
          date: new Date('2024-06-20'),
          image_url: 'https://placehold.co/600x400?text=Primer+Viaje',
        },
      ],
    });
    console.log('✅ 2 hitos de ejemplo creados.');
  }

  console.log('🌱 Seed finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
