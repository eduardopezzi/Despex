import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { DbService } from '@core/database/db.service';
import { WithTxn } from '@core/database/txn-def.interface';
import { OcrJobStatus, OcrFileStatus, OcrExecutionStatus, OcrProvider } from '@open-receipt-ocr/types';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';

async function seed() {
  const logger = new Logger('Seed');
  logger.log('Starting seed process...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const ocrJobsDao = app.get(OcrJobsDao);
  const ocrFilesDao = app.get(OcrFilesDao);
  const ocrExecutionsDao = app.get(OcrExecutionsDao);
  const dbService = app.get(DbService);
  const storage = app.get<StorageProvider>(StorageProvider);

  const N = 50;
  const staticFilesDir = path.resolve(__dirname, 'static');

  if (!fs.existsSync(staticFilesDir)) {
    logger.error(`Static files directory not found: ${staticFilesDir}`);
    await app.close();
    return;
  }

  const staticFiles = fs
    .readdirSync(staticFilesDir)
    .filter((f) => !f.startsWith('.'))
    .map((f) => path.join(staticFilesDir, f));

  if (staticFiles.length === 0) {
    logger.error('No static files found in server/seed/static');
    await app.close();
    return;
  }

  logger.log(`Seeding ${N} jobs using ${staticFiles.length} static files...`);

  for (let i = 0; i < N; i++) {
    await dbService.transaction(async (em) => {
      const txn = WithTxn(em);

      const job = await ocrJobsDao.create(txn, {
        status: OcrJobStatus.Processing,
        name: `Seed Job #${i + 1}`,
      });

      const numFiles = Math.floor(Math.random() * 3) + 1; // 1-3 files per job
      for (let j = 0; j < numFiles; j++) {
        const staticFile = staticFiles[Math.floor(Math.random() * staticFiles.length)];
        const ext = path.extname(staticFile).toLowerCase();
        const storageKey = `${randomUUID()}${ext}`;
        const originalName = path.basename(staticFile);

        let mimetype = 'application/octet-stream';
        if (ext === '.pdf') mimetype = 'application/pdf';
        else if (ext === '.png') mimetype = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';

        // Copy file to storage
        const stream = fs.createReadStream(staticFile);
        await storage.uploadStream(stream, storageKey, mimetype);

        const ocrFile = await ocrFilesDao.create(txn, {
          jobId: job.id,
          filename: storageKey,
          originalName: originalName,
          status: OcrFileStatus.Processing,
        });

        // Add a default execution
        await ocrExecutionsDao.create(txn, {
          fileId: ocrFile.id,
          ocrProvider: OcrProvider.Mistral,
          status: OcrExecutionStatus.Pending,
        });
      }
    });

    if ((i + 1) % 10 === 0) {
      logger.log(`  Processed ${i + 1}/${N} jobs...`);
    }
  }

  logger.log('✅ Seeding completed successfully!');
  await app.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
