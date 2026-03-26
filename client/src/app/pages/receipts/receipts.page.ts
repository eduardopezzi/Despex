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

@Component({
  selector: 'app-receipts-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, ProgressSpinnerModule, DialogModule, UploadDialogComponent],
  templateUrl: './receipts.page.html',
})
export class ReceiptsPageComponent implements OnInit {
  receiptService = inject(ReceiptService);
  showUploadDialog = false;
  showDetail = false;
  selectedReceipt: Receipt | null = null;

  ngOnInit() {
    this.receiptService.fetchReceipts();
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
