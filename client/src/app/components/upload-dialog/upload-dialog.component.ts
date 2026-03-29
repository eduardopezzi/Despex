import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { OcrProvider } from '@open-receipt-ocr/types';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { FileUploadModule, FileUploadHandlerEvent } from 'primeng/fileupload';

import { ConfigService } from '@services/config.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

interface FileWithProvider {
  file: File;
  ocrProvider: OcrProvider;
}

@Component({
  selector: 'app-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    MessageModule,
    ProgressBarModule,
    SelectModule,
    FormsModule,
    TranslocoModule,
    FileUploadModule,
  ],
  templateUrl: './upload-dialog.component.html',
})
export class UploadDialogComponent {
  private receiptService = inject(ReceiptService);
  private configService = inject(ConfigService);
  private translocoService = inject(TranslocoService);

  @Input() set visible(val: boolean) {
    this._visible = val;
    if (val) {
      this.reset();
    }
  }
  get visible() {
    return this._visible;
  }
  private _visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() uploaded = new EventEmitter<void>();

  filesWithProviders = signal<FileWithProvider[]>([]);
  uploading = signal(false);
  message = signal<string | null>(null);
  isError = signal(false);

  get ocrOptions() {
    return [
      { label: this.translocoService.translate('config.providers.mistral'), value: OcrProvider.Mistral },
      { label: this.translocoService.translate('config.providers.azure'), value: OcrProvider.Azure, disabled: true },
      { label: this.translocoService.translate('config.providers.aws'), value: OcrProvider.Aws, disabled: true },
    ];
  }

  reset() {
    this.filesWithProviders.set([]);
    this.message.set(null);
    this.isError.set(false);
    this.uploading.set(false);
  }

  onSelect(event: any) {
    const newFiles: File[] = event.currentFiles;
    const defaultProvider = this.configService.defaultOcrProvider() as OcrProvider;

    const current = this.filesWithProviders();
    const updated = [...current];

    newFiles.forEach((f) => {
      if (!updated.some((item) => item.file.name === f.name && item.file.size === f.size)) {
        updated.push({
          file: f,
          ocrProvider: defaultProvider === ('ask' as any) ? OcrProvider.Mistral : defaultProvider,
        });
      }
    });

    this.filesWithProviders.set(updated);
  }

  removeFile(item: FileWithProvider) {
    this.filesWithProviders.set(this.filesWithProviders().filter((f) => f !== item));
  }

  doUpload() {
    const items = this.filesWithProviders();
    if (items.length === 0) return;

    this.uploading.set(true);
    this.message.set(null);

    const files = items.map((i) => i.file);
    const providers = items.map((i) => i.ocrProvider);

    this.receiptService.uploadJob(files, providers).subscribe({
      next: () => {
        this.uploading.set(false);
        this.message.set('upload.uploadSuccess');
        this.isError.set(false);
        this.filesWithProviders.set([]);
        this.uploaded.emit();
        setTimeout(() => this.close(), 1000);
      },
      error: (err) => {
        this.uploading.set(false);
        this.message.set('upload.uploadFailed');
        this.isError.set(true);
        console.error(err);
      },
    });
  }

  close() {
    this.reset();
    this.visibleChange.emit(false);
  }

  formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
