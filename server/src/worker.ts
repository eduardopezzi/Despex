import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '@worker/worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);
  Logger.log('🚀 Worker is running and listening for jobs...');

  // Global error handlers to prevent the process from exiting on unhandled asynchronous errors
  process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    Logger.error('Uncaught Exception thrown:', err);
    if (err.message && err.message.includes('ECONNRESET')) {
      return;
    }
    // process.exit(1); 
  });
}

bootstrap().catch((err) => {
  Logger.error('Worker failed to start', err);
  process.exit(1);
});
