import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OcrJobService } from '@services/ocr-job.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { OcrProvider } from '@open-receipt-ocr/types';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { FileUploadModule, FileUploadHandlerEvent } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';

import { ConfigService } from '@services/config.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MimeType } from '@open-receipt-ocr/types';

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
    ToastModule,
    InputTextModule,
  ],
  templateUrl: './upload-dialog.component.html',
})
export class UploadDialogComponent {
  private ocrJobService = inject(OcrJobService);
  private configService = inject(ConfigService);
  private translocoService = inject(TranslocoService);
  private messageService = inject(MessageService);

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
  jobName = signal<string>('');
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
    this.jobName.set('');
    this.message.set(null);
    this.isError.set(false);
    this.uploading.set(false);
  }

  readonly ALLOWED_TYPES = [MimeType.Pdf, MimeType.Jpeg, MimeType.Png];

  get acceptTypes() {
    return this.ALLOWED_TYPES.join(',');
  }

  onSelect(event: any) {
    const newFiles: File[] = event.currentFiles;
    const defaultProvider = this.configService.defaultOcrProvider() as OcrProvider;

    const current = this.filesWithProviders();
    const updated = [...current];
    let skipped = 0;

    newFiles.forEach((f) => {
      if (!this.ALLOWED_TYPES.includes(f.type as MimeType)) {
        skipped++;
        return;
      }

      if (!updated.some((item) => item.file.name === f.name && item.file.size === f.size)) {
        updated.push({
          file: f,
          ocrProvider: defaultProvider === ('ask' as any) ? OcrProvider.Mistral : defaultProvider,
        });
      }
    });

    if (skipped > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Unsupported files',
        detail: `${skipped} file(s) were skipped (only PDF, JPG, PNG allowed).`,
      });
    }

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

    this.ocrJobService.uploadJob(files, providers, this.jobName()).subscribe({
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
