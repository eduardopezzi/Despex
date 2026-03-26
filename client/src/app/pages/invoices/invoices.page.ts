import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { UploadDialogComponent } from '../../components/upload-dialog/upload-dialog.component';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, ProgressSpinnerModule, DialogModule, UploadDialogComponent],
  templateUrl: './invoices.page.html',
})
export class InvoicesPageComponent implements OnInit {
  invoiceService = inject(InvoiceService);
  showUploadDialog = false;
  showDetail = false;
  selectedInvoice: Invoice | null = null;

  ngOnInit() {
    this.invoiceService.fetchInvoices();
  }

  onUploaded() {
    this.showUploadDialog = false;
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
