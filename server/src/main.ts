import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@app/app.module';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({ origin: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Open Receipt OCR API')
    .setDescription('Receipt management and OCR processing API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const secretProvider = app.get(SecretProvider);
  const port = await secretProvider.getSecretAsIntOrThrow(AppSecret.Port);
  await app.listen(port);

  // Global error handlers to prevent the process from exiting on unhandled asynchronous errors (like ECONNRESET)
  process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log it.
  });

  process.on('uncaughtException', (err) => {
    Logger.error('Uncaught Exception thrown:', err);
    // For specific fatal errors, you might want to exit, but generally for fetch resets we want to stay alive.
    if (err.message && err.message.includes('ECONNRESET')) {
      return;
    }
    // process.exit(1); // Optional: decide if you want to exit for other uncaught exceptions.
  });

  Logger.log(`🚀 Running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  Logger.error('Application failed to start', err);
  process.exit(1);
});
