import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OcrProviderAvailability } from '@open-receipt-ocr/types';
import { ConfigService } from '@app/config/config.service';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('ocr-providers')
  @ApiOperation({ summary: 'List OCR providers currently available from configured secrets' })
  getOcrProviderAvailability(): Promise<OcrProviderAvailability> {
    return this.configService.getOcrProviderAvailability();
  }
}
