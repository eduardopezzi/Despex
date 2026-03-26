import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';
import { ReceiptStatus } from '@models/receipt.model';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UploadDialogComponent } from '@components/upload-dialog/upload-dialog.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, ProgressSpinnerModule, UploadDialogComponent],
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
        label: 'Total',
        value: all.length,
        icon: 'pi pi-receipt',
        iconBg: 'bg-primary-50 dark:bg-primary-900/30',
        iconColor: 'text-primary-500',
      },
      {
        label: 'Completed',
        value: all.filter(i => i.status === ReceiptStatus.COMPLETED).length,
        icon: 'pi pi-check-circle',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
      },
      {
        label: 'Processing',
        value: all.filter(i => i.status === ReceiptStatus.PROCESSING || i.status === ReceiptStatus.PENDING).length,
        icon: 'pi pi-spin pi-spinner',
        iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
      },
      {
        label: 'Failed',
        value: all.filter(i => i.status === ReceiptStatus.FAILED).length,
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
