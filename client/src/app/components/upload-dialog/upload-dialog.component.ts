import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-upload-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, MessageModule, ProgressBarModule],
  templateUrl: './upload-dialog.component.html',
})
export class UploadDialogComponent {
  private receiptService = inject(ReceiptService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() uploaded = new EventEmitter<void>();

  file = signal<File | null>(null);
  uploading = signal(false);
  message = signal<string | null>(null);
  isError = signal(false);
  isDragging = signal(false);

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

    this.receiptService.uploadReceipt(f).subscribe({
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
