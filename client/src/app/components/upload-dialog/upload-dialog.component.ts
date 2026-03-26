import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-upload-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, MessageModule, ProgressBarModule],
  template: `
    <p-dialog
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      header="Upload Receipt"
      [style]="{ width: '480px' }"
    >
      <div class="flex flex-col gap-5">

        <!-- Drop zone -->
        <div
          class="border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer"
          [class.border-primary-400]="isDragging()"
          [class.bg-primary-50]="isDragging()"
          [class.dark:bg-primary-900\/20]="isDragging()"
          [class.border-surface-300]="!isDragging()"
          [class.dark:border-surface-700]="!isDragging()"
          (dragover)="$event.preventDefault(); isDragging.set(true)"
          (dragleave)="isDragging.set(false)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <i class="pi pi-cloud-upload text-4xl mb-3 block"
             [class.text-primary-500]="isDragging()"
             [class.text-surface-400]="!isDragging()">
          </i>
          @if (file()) {
            <p class="text-sm font-semibold text-surface-800 dark:text-surface-100">{{ file()!.name }}</p>
            <p class="text-xs text-surface-400 mt-1">{{ (file()!.size / 1024 / 1024).toFixed(2) }} MB</p>
          } @else {
            <p class="text-sm font-semibold text-surface-700 dark:text-surface-200">Drop your file here</p>
            <p class="text-xs text-surface-400 mt-1">PDF, JPG, PNG · max 20 MB</p>
          }
          <input #fileInput type="file" class="hidden"
                 accept="image/*,application/pdf"
                 (change)="onFileSelected($event)" />
        </div>

        <!-- Progress -->
        @if (uploading()) {
          <p-progressBar mode="indeterminate" styleClass="h-1.5 rounded-full" />
        }

        <!-- Message -->
        @if (message()) {
          <p-message
            [severity]="isError() ? 'error' : 'success'"
            [text]="message() || undefined"
          />
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [text]="true"
                  (onClick)="close()" [disabled]="uploading()" />
        <p-button label="Upload & Process" icon="pi pi-cloud-upload"
                  [loading]="uploading()" [disabled]="!file()"
                  (onClick)="doUpload()" />
      </ng-template>
    </p-dialog>
  `,
})
export class UploadDialogComponent {
  private invoiceService = inject(InvoiceService);

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

    this.invoiceService.uploadInvoice(f).subscribe({
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
