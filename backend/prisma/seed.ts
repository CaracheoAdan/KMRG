import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

async function main(): Promise<void> {
  console.log('Iniciando seed de la base de datos...');

  // 1. Crear o actualizar usuario administrador a partir de variables de entorno
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@kmrg.app').toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || '12345678';

  if (!adminPassword || adminPassword.trim().length < 8) {
    throw new Error(
      'Falta SEED_ADMIN_PASSWORD (o tiene menos de 8 caracteres). Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en el entorno antes de ejecutar el seed.',
    );
  }

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_COST);

  if (existingAdmin) {
    await prisma.adminUser.update({
      where: { email: adminEmail },
      data: { password_hash: passwordHash },
    });
    console.log(`Usuario administrador "${adminEmail}" actualizado con la contraseña proporcionada.`);
  } else {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
      },
    });

    console.log(`Usuario administrador creado con éxito (${adminEmail}).`);
  }

  // 2. Mensajes de ejemplo
  const messagesCount = await prisma.message.count();
  if (messagesCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          sender: 'Javier',
          recipient: 'Karla',
          content: '¡Buenos días, mi amor! Hoy es un día especial solo porque existes.',
          scheduled_date: new Date('2026-10-15'),
          theme_color: '#e63946',
          is_read: false,
        },
        {
          sender: 'Karla',
          recipient: 'Javier',
          content: 'Cada día a tu lado es un regalo. Gracias por ser tú.',
          scheduled_date: new Date('2026-10-20'),
          theme_color: '#457b9d',
          is_read: false,
        },
        {
          sender: 'Javier',
          recipient: 'Karla',
          content: '¿Recuerdas nuestra primera cita? Yo nunca la olvidaré.',
          scheduled_date: new Date('2026-11-01'),
          theme_color: '#f4a261',
          is_read: false,
        },
      ],
    });
    console.log('3 mensajes de ejemplo creados.');
  }

  // 3. Hitos de ejemplo
  const milestonesCount = await prisma.milestone.count();
  if (milestonesCount === 0) {
    await prisma.milestone.createMany({
      data: [
        {
          author: 'Javier',
          title: 'Nuestro primer beso',
          date: new Date('2024-02-14'),
          image_url: 'https://placehold.co/600x400?text=Primer+Beso',
        },
        {
          author: 'Karla',
          title: 'Primer viaje juntos',
          date: new Date('2024-06-20'),
          image_url: 'https://placehold.co/600x400?text=Primer+Viaje',
        },
      ],
    });
    console.log('2 hitos de ejemplo creados.');
  }

  console.log('Seed finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error ejecutando seed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
