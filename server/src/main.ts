import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
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
    .setDescription('Invoice management and OCR processing API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const secretProvider = app.get(SecretProvider);
  const port = (await secretProvider.getSecret(AppSecret.Port)) || '3000';
  await app.listen(port);

  Logger.log(`🚀 Running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
