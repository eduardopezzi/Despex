import { Module } from '@nestjs/common';
import { FiscalDocumentsService } from '@app/fiscal-documents/fiscal-documents.service';
import { SefazDfeProvider } from '@app/fiscal-documents/providers/sefaz-dfe.provider';

@Module({
  providers: [FiscalDocumentsService, SefazDfeProvider],
  exports: [FiscalDocumentsService],
})
export class FiscalDocumentsModule {}
