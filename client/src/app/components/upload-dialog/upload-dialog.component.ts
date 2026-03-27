import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { OcrProvider } from '@models/receipt.model';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

import { ConfigService } from '@services/config.service';

@Component({
  selector: 'app-upload-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, MessageModule, ProgressBarModule, SelectModule, FormsModule],
  templateUrl: './upload-dialog.component.html',
})
export class UploadDialogComponent {
  private receiptService = inject(ReceiptService);
  private configService = inject(ConfigService);

  @Input() set visible(val: boolean) {
    this._visible = val;
    if (val) {
      // When opening, reset OCR provider to default
      const def = this.configService.defaultOcrProvider();
      if (def !== 'ask') {
        this.ocrProvider.set(def);
      }
    }
  }
  get visible() { return this._visible; }
  private _visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() uploaded = new EventEmitter<void>();

  file = signal<File | null>(null);
  uploading = signal(false);
  message = signal<string | null>(null);
  isError = signal(false);
  isDragging = signal(false);

  ocrProvider = signal<OcrProvider>(OcrProvider.MISTRAL);
  ocrOptions = [
    { label: 'Mistral OCR', value: OcrProvider.MISTRAL },
    { label: 'Azure OCR (Coming Soon)', value: OcrProvider.AZURE, disabled: true },
    { label: 'AWS TextExtract (Coming Soon)', value: OcrProvider.AWS, disabled: true }
  ];

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setFile(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const f = event.dataTransfer?.files[0];
    if (f) this.setFile(f);
  }

  private setFile(f: File) {
    this.file.set(f);
    this.message.set(null);
    this.isError.set(false);
  }

  doUpload() {
    const f = this.file();
    if (!f) return;
    this.uploading.set(true);
    this.message.set(null);

    this.receiptService.uploadReceipt(f, this.ocrProvider()).subscribe({
      next: () => {
        this.uploading.set(false);
        this.message.set('Upload successful! OCR is queued.');
        this.isError.set(false);
        this.file.set(null);
        this.uploaded.emit();
      },
      error: () => {
        this.uploading.set(false);
        this.message.set('Upload failed. Please try again.');
        this.isError.set(true);
      },
    });
  }

  close() {
    this.file.set(null);
    this.message.set(null);
    this.isError.set(false);
    this.visibleChange.emit(false);
  }
}
