import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';
import { Receipt, ReceiptStatus } from '@models/receipt.model';
import { UploadDialogComponent } from '@components/upload-dialog/upload-dialog.component';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-receipts-page',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    DialogModule,
    UploadDialogComponent,
    MenuModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './receipts.page.html',
})
export class ReceiptsPageComponent implements OnInit {
  receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);
  
  showUploadDialog = false;
  showDetail = false;
  selectedReceipt: Receipt | null = null;

  exportItems: MenuItem[] = [
    {
      label: 'Native',
      items: [
        { label: 'Copy to Clipboard', icon: 'pi pi-copy', command: () => this.copyToClipboard() },
        { label: 'Download Markdown', icon: 'pi pi-file-export', command: () => this.downloadMarkdown() }
      ]
    },
    {
      label: 'External Integrations',
      items: [
        { label: 'Send to n8n', icon: 'pi pi-bolt', command: () => this.sendToN8N() },
        { label: 'Google Drive', icon: 'pi pi-google', command: () => this.sendToGoogleDrive() }
      ]
    }
  ];

  ngOnInit() {
    this.receiptService.fetchReceipts();
  }

  copyToClipboard() {
    if (!this.selectedReceipt?.ocrData) return;
    navigator.clipboard.writeText(this.selectedReceipt.ocrData);
    this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'OCR data copied to clipboard' });
  }

  downloadMarkdown() {
    if (!this.selectedReceipt?.ocrData) return;
    const blob = new Blob([this.selectedReceipt.ocrData], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedReceipt.originalName}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.messageService.add({ severity: 'success', summary: 'Downloaded', detail: 'Markdown file saved' });
  }

  sendToN8N() {
    this.messageService.add({ severity: 'info', summary: 'n8n', detail: 'n8n integration coming soon' });
  }

  sendToGoogleDrive() {
    this.messageService.add({ severity: 'info', summary: 'Google Drive', detail: 'Google Drive integration coming soon' });
  }

  onUploaded() {
    this.showUploadDialog = false;
    this.receiptService.fetchReceipts();
  }

  getStatusSeverity(status: ReceiptStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case ReceiptStatus.PENDING:    return 'secondary';
      case ReceiptStatus.PROCESSING: return 'info';
      case ReceiptStatus.COMPLETED:  return 'success';
      case ReceiptStatus.FAILED:     return 'danger';
    }
  }

  getCardBg(status: ReceiptStatus): string {
    switch (status) {
      case ReceiptStatus.PENDING:    return 'bg-surface-100 dark:bg-surface-800';
      case ReceiptStatus.PROCESSING: return 'bg-blue-50 dark:bg-blue-950/40';
      case ReceiptStatus.COMPLETED:  return 'bg-emerald-50 dark:bg-emerald-950/40';
      case ReceiptStatus.FAILED:     return 'bg-red-50 dark:bg-red-950/40';
    }
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pi pi-file-pdf text-red-400';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'pi pi-image text-emerald-400';
    return 'pi pi-file text-surface-400';
  }
}
