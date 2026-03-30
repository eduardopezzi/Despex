import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { DbService } from '@core/database/db.service';
import { NoTxn } from '@core/database/txn-def.interface';
import { Logger } from '@nestjs/common';

async function unseed() {
  const logger = new Logger('Unseed');
  logger.log('Starting unseed process...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const ocrFilesDao = app.get(OcrFilesDao);
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
    // Delete in order of dependencies
    await em.query('DELETE FROM ocr_executions');
    await em.query('DELETE FROM ocr_files');
    await em.query('DELETE FROM ocr_jobs');

    // Check if receipts table exists before trying to delete
    try {
      await em.query('DELETE FROM receipts');
      logger.log('  Cleared receipts table');
    } catch (e) {
      // Table might not exist or be named differently
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
