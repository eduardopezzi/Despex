import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OcrJobService } from '@services/ocr-job.service';
import { OcrOutputParserService } from '@app/pipes/parsers/ocr-output-parser.service';
import {
  OcrJob,
  OcrFile,
  OcrExecution,
  OcrJobStatus,
  OcrFileStatus,
  OcrExecutionStatus,
  OcrProvider,
  FileExtension,
  ImageExtensions,
  SortOrder,
} from '@open-receipt-ocr/types';
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
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OcrOutputPipe } from '@app/pipes/ocr-output.pipe';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-ocr-jobs-page',
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
    PaginatorModule,
    OcrOutputPipe,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    TableModule,
    SelectButtonModule,
  ],
  templateUrl: './ocr-jobs.page.html',
})
export class OcrJobsPageComponent implements OnInit, OnDestroy {
  ocrJobService = inject(OcrJobService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private confirmationService = inject(ConfirmationService);
  private sanitizer = inject(DomSanitizer);
  private ocrOutputParser = inject(OcrOutputParserService);

  private pollingSubscription?: Subscription;

  OcrJobStatus = OcrJobStatus;
  OcrExecutionStatus = OcrExecutionStatus;
  OcrProvider = OcrProvider;

  showUploadDialog = false;
  showDetail = false;
  selectedJob: OcrJob | null = null;
  private _selectedFile: OcrFile | null = null;
  safeUrl: SafeResourceUrl | null = null;

  first = 0;
  rows = 20;

  searchQuery = '';
  filterStatus: OcrJobStatus | null = null;
  sortField: 'id' | 'name' | 'createdAt' | 'status' | 'filesCount' = 'createdAt';
  sortOrderDir: SortOrder = SortOrder.DESC;
  viewMode: 'grid' | 'list' = (localStorage.getItem('ocr-jobs-view-mode') as 'grid' | 'list') || 'grid';

  // For the dropdown shortcut
  get sortOrder() {
    if (this.sortField === 'createdAt') {
      return this.sortOrderDir === SortOrder.DESC ? 'latest' : 'oldest';
    }
    return null;
  }

  set sortOrder(value: string | null) {
    if (value === 'latest') {
      this.sortField = 'createdAt';
      this.sortOrderDir = SortOrder.DESC;
    } else if (value === 'oldest') {
      this.sortField = 'createdAt';
      this.sortOrderDir = SortOrder.ASC;
    }
  }
  get viewOptions() {
    return [
      { label: this.translocoService.translate('ocrJobs.view.cards'), value: 'grid', icon: 'pi pi-th-large' },
      { label: this.translocoService.translate('ocrJobs.view.table'), value: 'list', icon: 'pi pi-list' },
    ];
  }

  onViewModeChange(mode: 'grid' | 'list') {
    this.viewMode = mode;
    localStorage.setItem('ocr-jobs-view-mode', mode);
  }

  get statusOptions() {
    return [
      { label: this.translocoService.translate('ocrJobs.filters.statusAll'), value: null },
      { label: this.translocoService.translate('ocrJobs.status.pending'), value: OcrJobStatus.Pending },
      { label: this.translocoService.translate('ocrJobs.status.processing'), value: OcrJobStatus.Processing },
      { label: this.translocoService.translate('ocrJobs.status.completed'), value: OcrJobStatus.Completed },
      { label: this.translocoService.translate('ocrJobs.status.failed'), value: OcrJobStatus.Failed },
    ];
  }

  get sortOptions() {
    return [
      { label: this.translocoService.translate('ocrJobs.filters.latest'), value: 'latest' },
      { label: this.translocoService.translate('ocrJobs.filters.oldest'), value: 'oldest' },
    ];
  }

  get providers() {
    return Object.values(OcrProvider);
  }

  getProviderIcon(provider: OcrProvider): string {
    const icons: Record<OcrProvider, string> = {
      [OcrProvider.Mistral]: 'pi pi-sparkles',
      [OcrProvider.TabScanner]: 'pi pi-bolt',
      [OcrProvider.PaddleOcrLocal]: 'pi pi-desktop',
      [OcrProvider.PaddleOcrApi]: 'pi pi-cloud',
    };
    return icons[provider] || 'pi pi-sparkles';
  }

  getProviderTranslationKey(provider: OcrProvider | string): string {
    return provider as string;
  }

  get selectedFile() {
    return this._selectedFile;
  }
  set selectedFile(file: OcrFile | null) {
    const hasFilenameChanged = this._selectedFile?.filename !== file?.filename;
    this._selectedFile = file;
    this.selectedExecution = this.getLatestExecution(file) || null;
    if (hasFilenameChanged || (file && !this.safeUrl)) {
      this.safeUrl = file ? this.getSafeUrl(file.filename) : null;
    }
  }
  selectedExecution: OcrExecution | null = null;

  ngOnInit() {
    this.fetchJobsWithPagination();
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  fetchJobsWithPagination(showLoading = true) {
    const page = Math.floor(this.first / this.rows) + 1;
    this.ocrJobService.fetchJobs(
      showLoading,
      page,
      this.rows,
      this.filterStatus || undefined,
      this.searchQuery || undefined,
      this.sortField,
      this.sortOrderDir,
    );
  }

  onPageChange(event: { first?: number; rows?: number }) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 20;
    this.fetchJobsWithPagination();
  }

  onFilterChange() {
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  onSearch() {
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  onSortChange() {
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  onTableSort(event: { field: string; order: number }) {
    this.sortField = event.field as 'id' | 'name' | 'createdAt' | 'status' | 'filesCount';
    this.sortOrderDir = event.order === 1 ? SortOrder.ASC : SortOrder.DESC;
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  constructor() {
    effect(() => {
      const jobs = this.ocrJobService.jobs();
      if (this.selectedJob) {
        const updated = jobs.find((j) => j.id === this.selectedJob?.id);
        if (updated) {
          this.selectedJob = updated;
          if (this._selectedFile) {
            const updatedFile = updated.files?.find((f) => f.id === this._selectedFile?.id);
            if (updatedFile) {
              const wasOnLatest = this.selectedExecution?.id === this.getLatestExecution(this._selectedFile)?.id;
              const hasFilenameChanged = this._selectedFile?.filename !== updatedFile.filename;
              this._selectedFile = updatedFile;
              if (hasFilenameChanged || !this.safeUrl) {
                this.safeUrl = this.getSafeUrl(updatedFile.filename);
              }

              if (this.selectedExecution) {
                const updatedExecution = updatedFile.executions?.find((e) => e.id === this.selectedExecution?.id);
                if (updatedExecution) {
                  this.selectedExecution = updatedExecution;
                } else if (wasOnLatest) {
                  this.selectedExecution = this.getLatestExecution(updatedFile) || null;
                }
              } else {
                this.selectedExecution = this.getLatestExecution(updatedFile) || null;
              }
            }
          }
        }
      }
    });
  }

  private startPolling() {
    if (this.pollingSubscription) return;
    this.pollingSubscription = interval(3000).subscribe(() => {
      const needsPolling = this.ocrJobService.jobs().some((j) => j.status === OcrJobStatus.Pending || j.status === OcrJobStatus.Processing);

      if (needsPolling) {
        this.fetchJobsWithPagination(false);
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
    if (!this.selectedExecution?.ocrData) return;
    const ocrData = this.selectedExecution.ocrData;
    const parsed = this.ocrOutputParser.parse(ocrData, this.selectedExecution.ocrProvider);
    const contentToCopy = parsed && parsed.markdown ? parsed.markdown : ocrData;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(contentToCopy);
    } else {
      const el = document.createElement('textarea');
      el.value = contentToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('ocrJobs.detail.copied'),
      detail: this.translocoService.translate('ocrJobs.detail.copySuccess'),
    });
  }

  downloadMarkdown() {
    if (!this.selectedExecution?.ocrData || !this.selectedFile) return;
    const ocrData = this.selectedExecution.ocrData;
    const parsed = this.ocrOutputParser.parse(ocrData, this.selectedExecution.ocrProvider);
    const contentToDownload = parsed && parsed.markdown ? parsed.markdown : ocrData;

    const blob = new Blob([contentToDownload], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedFile.originalName}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('ocrJobs.detail.downloaded'),
      detail: this.translocoService.translate('ocrJobs.detail.downloadSuccess'),
    });
  }

  onUploaded() {
    this.showUploadDialog = false;
    this.fetchJobsWithPagination();
  }

  getJobStatusSeverity(status: OcrJobStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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

  getFileStatusSeverity(status: OcrFileStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OcrFileStatus.Pending:
        return 'secondary';
      case OcrFileStatus.Processing:
        return 'info';
      case OcrFileStatus.Completed:
        return 'success';
      case OcrFileStatus.Failed:
        return 'danger';
    }
  }

  getExecutionStatusSeverity(status: OcrExecutionStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OcrExecutionStatus.Pending:
        return 'secondary';
      case OcrExecutionStatus.Running:
        return 'info';
      case OcrExecutionStatus.Completed:
        return 'success';
      case OcrExecutionStatus.Failed:
        return 'danger';
    }
  }

  getFileIcon(filename: string): string {
    const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '');
    if (ext === FileExtension.Pdf) return 'pi pi-file-pdf text-red-400';
    if (ImageExtensions.includes(ext as FileExtension)) return 'pi pi-image text-emerald-400';
    return 'pi pi-file text-surface-400';
  }

  isFileImage(filename: string): boolean {
    const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '');
    return ImageExtensions.includes(ext as FileExtension);
  }

  isFilePdf(filename: string): boolean {
    const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '');
    return ext === FileExtension.Pdf;
  }

  getSafeUrl(filename: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.ocrJobService.getFileUrl(filename));
  }

  getLatestExecution(file: OcrFile | null): OcrExecution | undefined {
    if (!file?.executions || file.executions.length === 0) return undefined;
    return [...file.executions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  reprocess(file: OcrFile, provider: OcrProvider) {
    this.ocrJobService.reprocessFile(file.id, provider).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: this.translocoService.translate('ocrJobs.card.retrying'),
          detail: this.translocoService.translate('ocrJobs.card.retryQueued'),
        });
        this.fetchJobsWithPagination();
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
      message: this.translocoService.translate('ocrJobs.delete.confirmation'),
      header: this.translocoService.translate('ocrJobs.delete.title'),
      accept: () => {
        this.ocrJobService.deleteJob(job.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translocoService.translate('ocrJobs.delete.success'),
            });
            this.fetchJobsWithPagination();
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
