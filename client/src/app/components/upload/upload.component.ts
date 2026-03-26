import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, MessageModule],
  templateUrl: './upload.component.html',
})
export class UploadComponent {
  private invoiceService = inject(InvoiceService);
  
  file = signal<File | null>(null);
  uploading = signal<boolean>(false);
  message = signal<string | null>(null);

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.file.set(file);
      this.message.set(null);
    }
  }

  async onUpload() {
    const currentFile = this.file();
    if (!currentFile) return;

    this.uploading.set(true);
    this.message.set('Uploading invoice...');

    this.invoiceService.uploadInvoice(currentFile).subscribe({
      next: (res) => {
        this.message.set('Upload successful! Processing OCR...');
        this.uploading.set(false);
        this.file.set(null);
        this.invoiceService.fetchInvoices();
      },
      error: (err) => {
        this.message.set('Upload failed. Please try again.');
        this.uploading.set(false);
      }
    });
  }
}
