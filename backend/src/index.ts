import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`🚀 KMRG Backend Server corriendo en http://0.0.0.0:${env.PORT}`);
  console.log(`🔒 Entorno: ${env.NODE_ENV}`);
  console.log(`🌐 CORS permitido para Admin Web: ${env.ADMIN_WEB_URL} y orígenes locales (LAN)`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nRecibida señal ${signal}. Cerrando servidor graciosamente...`);
  server.close(async () => {
    console.log('Servidor HTTP cerrado.');
    await prisma.$disconnect();
    console.log('Conexión con PostgreSQL desconectada.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
