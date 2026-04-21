import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { OcrJobService, OCR_PROVIDER_ICONS, LOCAL_PROVIDERS } from '@services/ocr-job.service';
import { OcrOutputParserService } from '@app/pipes/parsers/ocr-output-parser.service';
import {
  OcrJob,
  OcrFile,
  OcrExecution,
  OcrJobStatus,
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
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OcrOutputPipe } from '@app/pipes/ocr-output.pipe';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-ocr-jobs-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    DialogModule,
    UploadDialogComponent,
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
  private detailPollingSubscription?: Subscription;

  OcrJobStatus = OcrJobStatus;
  OcrExecutionStatus = OcrExecutionStatus;
  OcrProvider = OcrProvider;

  showUploadDialog = false;
  private _showDetail = false;
  get showDetail() {
    return this._showDetail;
  }
  set showDetail(value: boolean) {
    this._showDetail = value;
    if (!value) this.stopDetailPolling();
  }
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

  // Dropdown shortcut — plain field (two-way bound). Kept in sync with
  // sortField/sortOrderDir via onSortChange() and onTableSort().
  sortOrder: 'latest' | 'oldest' | null = 'latest';
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

  get providerGroups() {
    const all = Object.values(OcrProvider);
    return [
      { label: 'Local', providers: all.filter((p) => LOCAL_PROVIDERS.has(p)) },
      { label: 'Online', providers: all.filter((p) => !LOCAL_PROVIDERS.has(p)) },
    ];
  }

  getProviderIcon(provider: OcrProvider): string {
    return OCR_PROVIDER_ICONS[provider] || 'pi pi-sparkles';
  }

  get selectedFile() {
    return this._selectedFile;
  }
  set selectedFile(file: OcrFile | null) {
    this._selectedFile = file;
    this.selectedExecution = this.getLatestExecution(file) || null;
    this.safeUrl = file ? this.getSafeUrl(file.filename) : null;
  }
  selectedExecution: OcrExecution | null = null;

  ngOnInit() {
    setTimeout(() => {
      this.fetchJobsWithPagination();
    });
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.stopDetailPolling();
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

  onSortOrderChange(value: 'latest' | 'oldest' | null) {
    this.sortOrder = value;
    if (value === 'latest') {
      this.sortField = 'createdAt';
      this.sortOrderDir = SortOrder.DESC;
    } else if (value === 'oldest') {
      this.sortField = 'createdAt';
      this.sortOrderDir = SortOrder.ASC;
    }
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  onFilterStatusChange(value: OcrJobStatus | null) {
    this.filterStatus = value;
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  onTableSort(event: { field: string; order: number }) {
    this.sortField = event.field as 'id' | 'name' | 'createdAt' | 'status' | 'filesCount';
    this.sortOrderDir = event.order === 1 ? SortOrder.ASC : SortOrder.DESC;
    this.sortOrder = this.sortField === 'createdAt' ? (this.sortOrderDir === SortOrder.DESC ? 'latest' : 'oldest') : null;
    this.first = 0;
    this.fetchJobsWithPagination();
  }

  constructor() {
    effect(() => {
      const jobs = this.ocrJobService.jobs();
      if (this.selectedJob) {
        const updated = jobs.find((j: OcrJob) => j.id === this.selectedJob?.id);
        if (updated) {
          this.selectedJob = updated;
          if (this._selectedFile) {
            const updatedFile = updated.files?.find((f: OcrFile) => f.id === this._selectedFile?.id);
            if (updatedFile) {
              const wasOnLatest = this.selectedExecution?.id === this.getLatestExecution(this._selectedFile)?.id;
              const hasFilenameChanged = this._selectedFile?.filename !== updatedFile.filename;
              this._selectedFile = updatedFile;
              if (hasFilenameChanged || !this.safeUrl) {
                this.safeUrl = this.getSafeUrl(updatedFile.filename);
              }

              if (this.selectedExecution) {
                const updatedExecution = updatedFile.executions?.find((e: OcrExecution) => e.id === this.selectedExecution?.id);
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
      const needsPolling = this.ocrJobService.jobs().some((j: OcrJob) => j.status === OcrJobStatus.Pending || j.status === OcrJobStatus.Processing);

      if (needsPolling) {
        this.fetchJobsWithPagination(false);
      }
    });
  }

  private stopPolling() {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  private startDetailPolling() {
    this.stopDetailPolling();
    this.detailPollingSubscription = interval(5000).subscribe(() => {
      if (!this._showDetail) {
        this.stopDetailPolling();
        return;
      }
      const latest = this.getLatestExecution(this._selectedFile);
      if (latest?.status === OcrExecutionStatus.Completed || latest?.status === OcrExecutionStatus.Failed) {
        this.stopDetailPolling();
        return;
      }
      this.fetchJobsWithPagination(false);
    });
  }

  private stopDetailPolling() {
    this.detailPollingSubscription?.unsubscribe();
    this.detailPollingSubscription = undefined;
  }

  viewDetail(job: OcrJob) {
    this.selectedJob = job;
    this.showDetail = true;
    if (job.files && job.files.length > 0) {
      this.selectedFile = job.files[0];
    }
  }

  async copyToClipboard() {
    if (!this.selectedExecution?.ocrData) return;
    const ocrData = this.selectedExecution.ocrData;
    const parsed = this.ocrOutputParser.parse(ocrData, this.selectedExecution.ocrProvider);
    const contentToCopy = parsed && parsed.markdown ? parsed.markdown : ocrData;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(contentToCopy);
      } else {
        const el = document.createElement('textarea');
        el.value = contentToCopy;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(el);
        if (!successful) throw new Error('execCommand copy failed');
      }

      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('ocrJobs.detail.copied'),
        detail: this.translocoService.translate('ocrJobs.detail.copySuccess'),
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy to clipboard',
      });
    }
  }

  async copyAsPlainText() {
    if (!this.selectedExecution?.ocrData) return;
    const ocrData = this.selectedExecution.ocrData;
    const parsed = this.ocrOutputParser.parse(ocrData, this.selectedExecution.ocrProvider);
    const markdown = parsed && parsed.markdown ? parsed.markdown : ocrData;

    try {
      // Configuration for marked (explicitly pass to parse for clarity)
      const parseOptions = { gfm: true, breaks: true };

      // Convert markdown to HTML
      const html = (await marked.parse(markdown, parseOptions)) as string;

      // Create a temporary element and ATTACH IT TO THE DOM
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed'; // FIXED to avoid layout jumping
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '1200px';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.visibility = 'hidden';

      // Inject the HTML
      tempDiv.innerHTML = html;

      // PRE-PROCESS TABLES: Inject tabs between cells for visual column separation
      const tables = tempDiv.querySelectorAll('table');
      tables.forEach((table: HTMLTableElement) => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row: HTMLTableRowElement) => {
          const cells = row.querySelectorAll('th, td');
          cells.forEach((cell: Element, idx: number) => {
            // Add a tab to the cell text itself for better innerText capture
            if (idx < cells.length - 1) {
              cell.textContent = (cell.textContent || '') + '\t';
            }
          });
        });
      });

      document.body.appendChild(tempDiv);
      let plainText = tempDiv.innerText || '';
      document.body.removeChild(tempDiv);

      // FALLBACK: If innerText calculation failed, use a regex tag stripper
      if (!plainText.trim()) {
        plainText = html
          .replace(/<\/tr>/gi, '\n')
          .replace(/<\/td>/gi, '\t')
          .replace(/<[^>]+>/g, '') // Strip all other tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
      }

      const finalContent = plainText.trim();
      if (!finalContent) {
        throw new Error('Final content is empty');
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(finalContent);
      } else {
        const el = document.createElement('textarea');
        el.value = finalContent;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(el);
        if (!successful) throw new Error('execCommand copy failed');
      }

      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('ocrJobs.detail.copied'),
        detail: this.translocoService.translate('ocrJobs.detail.copyPlainTextSuccess'),
      });
    } catch (err) {
      console.error('Failed to convert to plain text:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy as plain text',
      });
    }
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

  refreshSelectedJob() {
    this.fetchJobsWithPagination(false);
  }

  private readonly statusSeverity: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    pending: 'secondary',
    processing: 'info',
    running: 'info',
    completed: 'success',
    failed: 'danger',
  };

  getStatusSeverity(status: string) {
    return this.statusSeverity[status] ?? 'secondary';
  }

  private ext(filename: string): string {
    return '.' + (filename.split('.').pop()?.toLowerCase() || '');
  }

  isFilePdf(filename: string): boolean {
    return this.ext(filename) === FileExtension.Pdf;
  }

  isFileImage(filename: string): boolean {
    return ImageExtensions.includes(this.ext(filename) as FileExtension);
  }

  getFileIcon(filename: string): string {
    if (this.isFilePdf(filename)) return 'pi pi-file-pdf text-red-400';
    if (this.isFileImage(filename)) return 'pi pi-image text-emerald-400';
    return 'pi pi-file text-surface-400';
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
        this.startDetailPolling();
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
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('common.delete'),
      rejectLabel: this.translocoService.translate('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
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
