import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '@services/invoice.service';
import { InvoiceStatus } from '@models/invoice.model';
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
