import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, CardModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  
  invoices = this.invoiceService.invoices;
  loading = this.invoiceService.loading;
  selectedInvoice = signal<Invoice | null>(null);

  ngOnInit() {
    this.invoiceService.fetchInvoices();
  }

  onSelectInvoice(invoice: Invoice) {
    this.selectedInvoice.set(invoice);
  }

  /** Return severity for PrimeNG p-tag based on invoice status */
  getStatusSeverity(status: InvoiceStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case InvoiceStatus.PENDING: return 'secondary';
      case InvoiceStatus.PROCESSING: return 'info';
      case InvoiceStatus.COMPLETED: return 'success';
      case InvoiceStatus.FAILED: return 'danger';
      default: return 'secondary';
    }
  }

  parseOcr(data?: string) {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }
}
