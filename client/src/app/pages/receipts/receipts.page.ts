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
import { MenuItem, MessageService } from 'primeng/api';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

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
    ToastModule,
    TranslocoModule
  ],
  providers: [MessageService],
  templateUrl: './receipts.page.html',
})
export class ReceiptsPageComponent implements OnInit {
  receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  
  showUploadDialog = false;
  showDetail = false;
  selectedReceipt: Receipt | null = null;

  get exportItems(): MenuItem[] {
    return [
      {
        label: this.translocoService.translate('receipts.detail.exportTitleNative'),
        items: [
          { 
            label: this.translocoService.translate('receipts.detail.copyToClipboard'), 
            icon: 'pi pi-copy', 
            command: () => this.copyToClipboard() 
          },
          { 
            label: this.translocoService.translate('receipts.detail.downloadMarkdown'), 
            icon: 'pi pi-file-export', 
            command: () => this.downloadMarkdown() 
          }
        ]
      },
      {
        label: this.translocoService.translate('receipts.detail.exportTitleExternal'),
        items: [
          { 
            label: this.translocoService.translate('receipts.detail.sendToN8n'), 
            icon: 'pi pi-bolt', 
            command: () => this.sendToN8N() 
          },
          { 
            label: this.translocoService.translate('receipts.detail.sendToGoogleDrive'), 
            icon: 'pi pi-google', 
            command: () => this.sendToGoogleDrive() 
          }
        ]
      }
    ];
  }

  ngOnInit() {
    this.receiptService.fetchReceipts();
  }

  copyToClipboard() {
    if (!this.selectedReceipt?.ocrData) return;
    navigator.clipboard.writeText(this.selectedReceipt.ocrData);
    this.messageService.add({ 
      severity: 'success', 
      summary: this.translocoService.translate('receipts.detail.copied'), 
      detail: this.translocoService.translate('receipts.detail.copySuccess') 
    });
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
    this.messageService.add({ 
      severity: 'success', 
      summary: this.translocoService.translate('receipts.detail.downloaded'), 
      detail: this.translocoService.translate('receipts.detail.downloadSuccess') 
    });
  }

  sendToN8N() {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'n8n', 
      detail: this.translocoService.translate('receipts.detail.n8nComingSoon') 
    });
  }

  sendToGoogleDrive() {
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Google Drive', 
      detail: this.translocoService.translate('receipts.detail.googleDriveComingSoon') 
    });
  }

  onUploaded() {
    this.showUploadDialog = false;
    this.receiptService.fetchReceipts();
  }

  getStatusSeverity(status: ReceiptStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case ReceiptStatus.Pending:    return 'secondary';
      case ReceiptStatus.Processing: return 'info';
      case ReceiptStatus.Completed:  return 'success';
      case ReceiptStatus.Failed:     return 'danger';
    }
  }

  getCardBg(status: ReceiptStatus): string {
    switch (status) {
      case ReceiptStatus.Pending:    return 'bg-surface-100 dark:bg-surface-800';
      case ReceiptStatus.Processing: return 'bg-blue-50 dark:bg-blue-950/40';
      case ReceiptStatus.Completed:  return 'bg-emerald-50 dark:bg-emerald-950/40';
      case ReceiptStatus.Failed:     return 'bg-red-50 dark:bg-red-950/40';
    }
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pi pi-file-pdf text-red-400';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'pi pi-image text-emerald-400';
    return 'pi pi-file text-surface-400';
  }

  isFileImage(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
  }
}
