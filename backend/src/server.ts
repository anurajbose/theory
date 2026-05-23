import 'dotenv/config';
import './observability/tracing'; // MUST precede app/prisma so libs are instrumented
import app from './app';
import logger from './utils/logger';
import prisma from './utils/prisma';
import { startCronJobs } from './jobs/cron';
import { startWorkers, stopWorkers } from './queue/workers';
import { closeQueues } from './queue/queues';
import { closeConnection } from './queue/connection';
import { initRealtime, closeRealtime } from './realtime/io';
import { initAi } from './core/ai/provider';

const PORT = Number(process.env.PORT) || 4000;
const QUEUES_ON = process.env.QUEUES_ENABLED !== 'false';

async function main() {
  await prisma.$connect();
  logger.info('Database connected');

  if (QUEUES_ON) {
    // Resilient: a Redis outage must not stop the API from serving.
    try {
      startWorkers();
    } catch (err) {
      logger.error('Queue workers failed to start (continuing without workers)', err);
    }
  }

  initAi(); // registers the model runner only if AI_ENABLED + provider configured

  startCronJobs();

  const server = app.listen(PORT, () => {
    logger.info(`THEORY API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Realtime — resilient: failure must not stop the API.
  try {
    await initRealtime(server);
  } catch (err) {
    logger.error('Realtime failed to start (continuing without it)', err);
  }

  const shutdown = async (sig: string) => {
    logger.info(`Shutdown (${sig}) — draining`);
    server.close();
    await closeRealtime();
    if (QUEUES_ON) {
      await stopWorkers();
      await closeQueues();
      await closeConnection();
    }
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Startup failed', err);
  process.exit(1);
});
