import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
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

  getStatusClass(status: InvoiceStatus) {
    switch (status) {
      case InvoiceStatus.PENDING: return 'badge-pending';
      case InvoiceStatus.PROCESSING: return 'badge-processing';
      case InvoiceStatus.COMPLETED: return 'badge-completed';
      case InvoiceStatus.FAILED: return 'badge-failed';
      default: return '';
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
