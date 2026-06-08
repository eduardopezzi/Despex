import { Module } from '@nestjs/common';
import { ConfigController } from '@app/config/config.controller';
import { ConfigService } from '@app/config/config.service';
import { SecretsModule } from '@core/secrets/secrets.module';

@Module({
  imports: [SecretsModule],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
