import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';
import { OcrJobStatus, OcrJob } from '@open-receipt-ocr/types';
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

  OcrJobStatus = OcrJobStatus;

  ngOnInit() {
    this.receiptService.fetchJobs();
  }

  get recentJobs() {
    return this.receiptService.jobs().slice(0, 6);
  }

  get stats() {
    const all = this.receiptService.jobs();
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
        value: all.filter((i: OcrJob) => i.status === OcrJobStatus.Completed).length,
        icon: 'pi pi-check-circle',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
      },
      {
        label: 'receipts.status.processing',
        value: all.filter((i: OcrJob) => i.status === OcrJobStatus.Processing || i.status === OcrJobStatus.Pending).length,
        icon: 'pi pi-spin pi-spinner',
        iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
      },
      {
        label: 'receipts.status.failed',
        value: all.filter((i: OcrJob) => i.status === OcrJobStatus.Failed).length,
        icon: 'pi pi-exclamation-triangle',
        iconBg: 'bg-red-50 dark:bg-red-950/30',
        iconColor: 'text-red-500',
      },
    ];
  }

  onUploaded() {
    this.showUpload = false;
    this.receiptService.fetchJobs();
  }

  getStatusSeverity(status: OcrJobStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OcrJobStatus.Pending:
        return 'secondary';
      case OcrJobStatus.Processing:
        return 'info';
      case OcrJobStatus.Completed:
        return 'success';
      case OcrJobStatus.Failed:
        return 'danger';
    }
  }

  getCardBg(status: OcrJobStatus): string {
    switch (status) {
      case OcrJobStatus.Pending:
        return 'bg-surface-100 dark:bg-surface-800';
      case OcrJobStatus.Processing:
        return 'bg-blue-50 dark:bg-blue-950/40';
      case OcrJobStatus.Completed:
        return 'bg-emerald-50 dark:bg-emerald-950/40';
      case OcrJobStatus.Failed:
        return 'bg-red-50 dark:bg-red-950/40';
    }
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pi pi-file-pdf text-red-400';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'pi pi-image text-emerald-400';
    return 'pi pi-file text-surface-400';
  }
}
