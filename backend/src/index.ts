import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, adminWebUrl: env.ADMIN_WEB_URL },
    `KMRG Backend Server corriendo en http://0.0.0.0:${env.PORT}`,
  );
});

const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, `Recibida señal ${signal}. Cerrando servidor graciosamente...`);
  server.close(async () => {
    logger.info('Servidor HTTP cerrado.');
    await prisma.$disconnect();
    logger.info('Conexión con PostgreSQL desconectada.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

