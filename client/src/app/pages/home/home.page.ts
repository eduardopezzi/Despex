import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';
import { ReceiptStatus } from '@models/receipt.model';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UploadDialogComponent } from '@components/upload-dialog/upload-dialog.component';

import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, ProgressSpinnerModule, UploadDialogComponent, TranslocoModule],
  templateUrl: './home.page.html',
})
export class HomePageComponent implements OnInit {
  receiptService = inject(ReceiptService);
  showUpload = false;

  ngOnInit() {
    this.receiptService.fetchReceipts();
  }

  get recentReceipts() {
    return this.receiptService.receipts().slice(0, 6);
  }

  get stats() {
    const all = this.receiptService.receipts();
    return [
      {
        label: 'receipts.status.total',
        value: all.length,
        icon: 'pi pi-receipt',
        iconBg: 'bg-primary-50 dark:bg-primary-900/30',
        iconColor: 'text-primary-500',
      },
      {
        label: 'receipts.status.completed',
        value: all.filter(i => i.status === ReceiptStatus.Completed).length,
        icon: 'pi pi-check-circle',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
      },
      {
        label: 'receipts.status.processing',
        value: all.filter(i => i.status === ReceiptStatus.Processing || i.status === ReceiptStatus.Pending).length,
        icon: 'pi pi-spin pi-spinner',
        iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
      },
      {
        label: 'receipts.status.failed',
        value: all.filter(i => i.status === ReceiptStatus.Failed).length,
        icon: 'pi pi-exclamation-triangle',
        iconBg: 'bg-red-50 dark:bg-red-900/30',
        iconColor: 'text-red-500',
      },
    ];
  }

  onUploaded() {
    this.showUpload = false;
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
}
