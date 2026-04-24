import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '@worker/worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);
  Logger.log('🚀 Worker is running and listening for jobs...');
}

bootstrap().catch((err) => {
  Logger.error('Worker failed to start', err);
  process.exit(1);
});
