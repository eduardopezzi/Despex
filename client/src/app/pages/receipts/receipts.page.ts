import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptService } from '@services/receipt.service';
import { OcrJob, OcrFile, OcrExecution, OcrJobStatus, OcrFileStatus, OcrExecutionStatus, OcrProvider } from '@open-receipt-ocr/types';
import { interval, Subscription } from 'rxjs';
import { UploadDialogComponent } from '@components/upload-dialog/upload-dialog.component';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MenuItem, MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';

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
    TranslocoModule,
    ConfirmDialogModule,
    TooltipModule,
    PopoverModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './receipts.page.html',
})
export class ReceiptsPageComponent implements OnInit, OnDestroy {
  receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private confirmationService = inject(ConfirmationService);

  private pollingSubscription?: Subscription;

  OcrJobStatus = OcrJobStatus;
  OcrFileStatus = OcrFileStatus;
  OcrExecutionStatus = OcrExecutionStatus;
  OcrProvider = OcrProvider;

  showUploadDialog = false;
  showDetail = false;
  selectedJob: OcrJob | null = null;
  selectedFile: OcrFile | null = null;

  get exportItems(): MenuItem[] {
    return [
      {
        label: this.translocoService.translate('receipts.detail.exportTitleNative'),
        items: [
          {
            label: this.translocoService.translate('receipts.detail.copyToClipboard'),
            icon: 'pi pi-copy',
            command: () => this.copyToClipboard(),
          },
          {
            label: this.translocoService.translate('receipts.detail.downloadMarkdown'),
            icon: 'pi pi-file-export',
            command: () => this.downloadMarkdown(),
          },
        ],
      },
    ];
  }

  ngOnInit() {
    this.receiptService.fetchJobs();
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  constructor() {
    effect(() => {
      const jobs = this.receiptService.jobs();
      if (this.selectedJob) {
        const updated = jobs.find((j) => j.id === this.selectedJob?.id);
        if (updated) {
          this.selectedJob = updated;
          if (this.selectedFile) {
            const updatedFile = updated.files?.find(f => f.id === this.selectedFile?.id);
            if (updatedFile) this.selectedFile = updatedFile;
          }
        }
      }
    });
  }

  private startPolling() {
    if (this.pollingSubscription) return;
    this.pollingSubscription = interval(3000).subscribe(() => {
      const needsPolling = this.receiptService
        .jobs()
        .some((j) => j.status === OcrJobStatus.Pending || j.status === OcrJobStatus.Processing);

      if (needsPolling) {
        this.receiptService.fetchJobs(false);
      }
    });
  }

  private stopPolling() {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  viewDetail(job: OcrJob) {
    this.selectedJob = job;
    this.showDetail = true;
    if (job.files && job.files.length > 0) {
      this.selectedFile = job.files[0];
    }
  }

  copyToClipboard() {
    const latestExecution = this.getLatestExecution(this.selectedFile);
    if (!latestExecution?.ocrData) return;
    navigator.clipboard.writeText(latestExecution.ocrData);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('receipts.detail.copied'),
      detail: this.translocoService.translate('receipts.detail.copySuccess'),
    });
  }

  downloadMarkdown() {
    const latestExecution = this.getLatestExecution(this.selectedFile);
    if (!latestExecution?.ocrData || !this.selectedFile) return;
    const blob = new Blob([latestExecution.ocrData], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedFile.originalName}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('receipts.detail.downloaded'),
      detail: this.translocoService.translate('receipts.detail.downloadSuccess'),
    });
  }

  onUploaded() {
    this.showUploadDialog = false;
    this.receiptService.fetchJobs();
  }

  getJobStatusSeverity(status: OcrJobStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OcrJobStatus.Pending: return 'secondary';
      case OcrJobStatus.Processing: return 'info';
      case OcrJobStatus.Completed: return 'success';
      case OcrJobStatus.Failed: return 'danger';
    }
  }

  getFileStatusSeverity(status: OcrFileStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OcrFileStatus.Pending: return 'secondary';
      case OcrFileStatus.Processing: return 'info';
      case OcrFileStatus.Completed: return 'success';
      case OcrFileStatus.Failed: return 'danger';
    }
  }

  getExecutionStatusSeverity(status: OcrExecutionStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OcrExecutionStatus.Pending: return 'secondary';
      case OcrExecutionStatus.Running: return 'info';
      case OcrExecutionStatus.Completed: return 'success';
      case OcrExecutionStatus.Failed: return 'danger';
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

  getLatestExecution(file: OcrFile | null): OcrExecution | undefined {
    if (!file?.executions || file.executions.length === 0) return undefined;
    return [...file.executions].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  reprocess(file: OcrFile, provider: OcrProvider) {
    this.receiptService.reprocessFile(file.id, provider).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: this.translocoService.translate('receipts.card.retrying'),
          detail: this.translocoService.translate('receipts.card.retryQueued'),
        });
        this.receiptService.fetchJobs();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to re-queue OCR job.' });
        console.error(err);
      },
    });
  }

  deleteJob(event: Event, job: OcrJob) {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: this.translocoService.translate('receipts.delete.confirmation'),
      header: this.translocoService.translate('receipts.delete.title'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.receiptService.deleteJob(job.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translocoService.translate('receipts.delete.success'),
            });
            this.receiptService.fetchJobs();
            if (this.selectedJob?.id === job.id) {
              this.showDetail = false;
            }
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete job.' });
            console.error(err);
          },
        });
      },
    });
  }
}
