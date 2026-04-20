import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OcrJobService } from '@services/ocr-job.service';
import { OcrJobStatus, OcrJob } from '@open-receipt-ocr/types';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UploadDialogComponent } from '@components/upload-dialog/upload-dialog.component';

import { RouterLink, RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, DatePipe, CardModule, ButtonModule, TagModule, ProgressSpinnerModule, UploadDialogComponent, TranslocoModule, RouterModule, RouterLink],
  templateUrl: './home.page.html',
})
export class HomePageComponent implements OnInit {
  ocrJobService = inject(OcrJobService);
  showUpload = false;

  OcrJobStatus = OcrJobStatus;

  ngOnInit() {
    this.ocrJobService.fetchJobs();
  }

  get recentJobs() {
    return this.ocrJobService.jobs().slice(0, 6);
  }

  get stats() {
    const all = this.ocrJobService.jobs();
    return [
      {
        label: 'ocrJobs.status.total',
        value: all.length,
        icon: 'pi pi-receipt',
        iconBg: 'bg-primary-50 dark:bg-primary-900/30',
        iconColor: 'text-primary-500',
      },
      {
        label: 'ocrJobs.status.completed',
        value: all.filter((i: OcrJob) => i.status === OcrJobStatus.Completed).length,
        icon: 'pi pi-check-circle',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
      },
      {
        label: 'ocrJobs.status.processing',
        value: all.filter((i: OcrJob) => i.status === OcrJobStatus.Processing || i.status === OcrJobStatus.Pending).length,
        icon: 'pi pi-spin pi-spinner',
        iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
      },
      {
        label: 'ocrJobs.status.failed',
        value: all.filter((i: OcrJob) => i.status === OcrJobStatus.Failed).length,
        icon: 'pi pi-exclamation-triangle',
        iconBg: 'bg-red-50 dark:bg-red-950/30',
        iconColor: 'text-red-500',
      },
    ];
  }

  onUploaded() {
    this.showUpload = false;
    this.ocrJobService.fetchJobs();
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
}
