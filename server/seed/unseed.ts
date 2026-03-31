import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { NoTxn, WithTxn } from '@core/database/txn-def.interface';
import { DbService } from '@core/database/db.service';
import { Logger } from '@nestjs/common';

async function unseed() {
  const logger = new Logger('Unseed');
  logger.log('Starting unseed process...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const ocrExecutionsDao = app.get(OcrExecutionsDao);
  const ocrFilesDao = app.get(OcrFilesDao);
  const ocrJobsDao = app.get(OcrJobsDao);
  const receiptsDao = app.get(ReceiptsDao);
  const dbService = app.get(DbService);
  const storage = app.get<StorageProvider>(StorageProvider);

  // 1. Get all files to delete from storage before clearing DB
  const files = await ocrFilesDao.getAll(NoTxn);
  logger.log(`Deleting ${files.length} physical files from storage...`);
  for (const file of files) {
    try {
      if (await storage.exists(file.filename)) {
        await storage.delete(file.filename);
        logger.log(`  Deleted ${file.filename}`);
      }
    } catch (err) {
      logger.error(`Failed to delete file ${file.filename}: ${(err as Error).message}`);
    }
  }

  // 2. Truncate tables manually to be sure everything is wiped
  logger.log('Truncating database tables (OCR Job data)...');

  await dbService.transaction(async (em) => {
    const txn = WithTxn(em);

    // Truncate in order of dependencies
    await ocrExecutionsDao.truncate(txn);
    await ocrFilesDao.truncate(txn);
    await ocrJobsDao.truncate(txn);

    try {
      await receiptsDao.truncate(txn);
      logger.log('  Cleared receipts table');
    } catch {
      // Table might not exist or entity not registered
    }
  });

  logger.log('✅ Unseeding completed successfully!');
  await app.close();
  process.exit(0);
}

unseed().catch((err) => {
  console.error('❌ Unseeding failed:', err);
  process.exit(1);
});
