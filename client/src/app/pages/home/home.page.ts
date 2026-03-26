import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceStatus } from '../../models/invoice.model';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UploadDialogComponent } from '../../components/upload-dialog/upload-dialog.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, ProgressSpinnerModule, UploadDialogComponent],
  template: `
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-1">Welcome back 👋</h1>
      <p class="text-sm text-surface-500 dark:text-surface-400">Here's a quick overview of your receipt OCR pipeline.</p>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      @for (stat of stats; track stat.label) {
        <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" [ngClass]="stat.iconBg">
              <i [class]="stat.icon + ' ' + stat.iconColor + ' text-lg'"></i>
            </div>
            <span class="text-xs font-semibold text-surface-500 uppercase tracking-wide">{{ stat.label }}</span>
          </div>
          <p class="text-3xl font-bold text-surface-900 dark:text-surface-0">{{ stat.value }}</p>
        </div>
      }
    </div>

    <!-- Recent receipts -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-base font-semibold text-surface-800 dark:text-surface-100">Recent Receipts</h2>
      <p-button label="Upload Receipt" icon="pi pi-cloud-upload" size="small" (onClick)="showUpload = true" />
    </div>

    @if (invoiceService.loading()) {
      <div class="flex justify-center py-16"><p-progressSpinner styleClass="w-10 h-10" /></div>
    }
    @if (!invoiceService.loading() && invoiceService.invoices().length === 0) {
      <div class="bg-surface-0 dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700
                  rounded-2xl p-12 text-center">
        <i class="pi pi-receipt text-4xl text-surface-300 dark:text-surface-600 mb-4 block"></i>
        <p class="text-surface-500 text-sm">No receipts yet. Upload your first one!</p>
      </div>
    }

    @if (!invoiceService.loading() && invoiceService.invoices().length > 0) {
      <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm overflow-hidden">
        @for (invoice of recentInvoices; track invoice.id) {
          <div class="flex items-center gap-4 px-5 py-4 border-b border-surface-100 dark:border-surface-800 last:border-0
                      hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                 [ngClass]="getCardBg(invoice.status)">
              <i [class]="getFileIcon(invoice.originalName)"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">{{ invoice.originalName }}</p>
              <p class="text-xs text-surface-400">{{ invoice.createdAt | date:'MMM d · HH:mm' }}</p>
            </div>
            <p-tag [value]="invoice.status" [severity]="getStatusSeverity(invoice.status)" styleClass="text-xs" />
          </div>
        }
      </div>
    }

    <app-upload-dialog [(visible)]="showUpload" (uploaded)="onUploaded()" />
  `,
})
export class HomePageComponent implements OnInit {
  invoiceService = inject(InvoiceService);
  showUpload = false;

  ngOnInit() {
    this.invoiceService.fetchInvoices();
  }

  get recentInvoices() {
    return this.invoiceService.invoices().slice(0, 6);
  }

  get stats() {
    const all = this.invoiceService.invoices();
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
        value: all.filter(i => i.status === InvoiceStatus.COMPLETED).length,
        icon: 'pi pi-check-circle',
        iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
      },
      {
        label: 'Processing',
        value: all.filter(i => i.status === InvoiceStatus.PROCESSING || i.status === InvoiceStatus.PENDING).length,
        icon: 'pi pi-spin pi-spinner',
        iconBg: 'bg-blue-50 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
      },
      {
        label: 'Failed',
        value: all.filter(i => i.status === InvoiceStatus.FAILED).length,
        icon: 'pi pi-exclamation-triangle',
        iconBg: 'bg-red-50 dark:bg-red-900/30',
        iconColor: 'text-red-500',
      },
    ];
  }

  onUploaded() {
    this.showUpload = false;
    this.invoiceService.fetchInvoices();
  }

  getStatusSeverity(status: InvoiceStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case InvoiceStatus.PENDING:    return 'secondary';
      case InvoiceStatus.PROCESSING: return 'info';
      case InvoiceStatus.COMPLETED:  return 'success';
      case InvoiceStatus.FAILED:     return 'danger';
    }
  }

  getCardBg(status: InvoiceStatus): string {
    switch (status) {
      case InvoiceStatus.PENDING:    return 'bg-surface-100 dark:bg-surface-800';
      case InvoiceStatus.PROCESSING: return 'bg-blue-50 dark:bg-blue-950/40';
      case InvoiceStatus.COMPLETED:  return 'bg-emerald-50 dark:bg-emerald-950/40';
      case InvoiceStatus.FAILED:     return 'bg-red-50 dark:bg-red-950/40';
    }
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pi pi-file-pdf text-red-400';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'pi pi-image text-emerald-400';
    return 'pi pi-file text-surface-400';
  }
}
