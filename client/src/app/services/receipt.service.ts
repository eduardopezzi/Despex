import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OcrProvider, Receipt } from '@models/receipt.model';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/receipts`;

  // State using Signal
  receipts = signal<Receipt[]>([]);
  loading = signal<boolean>(false);

  fetchReceipts() {
    this.loading.set(true);
    return this.http.get<Receipt[]>(this.apiUrl).pipe(
      tap(data => {
        this.receipts.set(data);
        this.loading.set(false);
      })
    ).subscribe();
  }

  uploadReceipt(file: File, ocrProvider: OcrProvider = OcrProvider.Mistral) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ocrProvider', ocrProvider);
    return this.http.post<{ id: number; message: string }>(`${this.apiUrl}/upload`, formData);
  }

  getReceipt(id: number): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/${id}`);
  }

  getFileUrl(key: string): string {
    return `${this.apiUrl}/uploads/${key}`;
  }
}
