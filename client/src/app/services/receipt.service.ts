import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OcrProvider, OcrJob, OcrExecution } from '@open-receipt-ocr/types';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReceiptService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/receipts`;

  // State using Signal
  jobs = signal<OcrJob[]>([]);
  loading = signal<boolean>(false);

  fetchJobs(showLoading = true) {
    if (showLoading) {
      this.loading.set(true);
    }
    return this.http
      .get<OcrJob[]>(this.apiUrl)
      .pipe(
        tap((data) => {
          this.jobs.set(data);
          this.loading.set(false);
        }),
      )
      .subscribe();
  }

  uploadJob(files: File[], providers: OcrProvider[], jobName?: string) {
    const formData = new FormData();
    if (jobName) {
      formData.append('jobName', jobName);
    }
    files.forEach((file, index) => {
      formData.append('files', file);
      formData.append(`ocrProvider_${index}`, providers[index]);
    });
    return this.http.post<{ id: number }>(`${this.apiUrl}/upload`, formData);
  }

  getJob(id: number): Observable<OcrJob> {
    return this.http.get<OcrJob>(`${this.apiUrl}/${id}`);
  }

  getFileUrl(key: string): string {
    return `${this.apiUrl}/uploads/${key}`;
  }

  reprocessFile(fileId: number, ocrProvider: OcrProvider): Observable<OcrExecution> {
    return this.http.post<OcrExecution>(`${this.apiUrl}/files/${fileId}/reprocess`, { ocrProvider });
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
