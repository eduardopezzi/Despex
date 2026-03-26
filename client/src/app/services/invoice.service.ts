import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Invoice } from '@models/invoice.model';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private http = inject(HttpClient);
  private apiUrl = '/api/invoices';

  // State using Signal
  invoices = signal<Invoice[]>([]);
  loading = signal<boolean>(false);

  fetchInvoices() {
    this.loading.set(true);
    return this.http.get<Invoice[]>(this.apiUrl).pipe(
      tap(data => {
        this.invoices.set(data);
        this.loading.set(false);
      })
    ).subscribe();
  }

  uploadInvoice(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ id: number; message: string }>(`${this.apiUrl}/upload`, formData);
  }

  getInvoice(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }
}
