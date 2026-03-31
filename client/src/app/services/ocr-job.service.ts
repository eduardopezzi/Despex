import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OcrProvider, OcrJob, OcrExecution, PaginatedResponse } from '@open-receipt-ocr/types';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OcrJobService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ocr-jobs`;

  // State using Signal
  jobs = signal<OcrJob[]>([]);
  totalCount = signal<number>(0);
  loading = signal<boolean>(false);

  fetchJobs(showLoading = true, page?: number, pageSize?: number) {
    if (showLoading) {
      this.loading.set(true);
    }

    let params = {};
    if (page !== undefined && pageSize !== undefined) {
      params = { page, pageSize };
    }

    return this.http
      .get<PaginatedResponse<OcrJob>>(this.apiUrl, { params })
      .pipe(
        tap((res) => {
          this.jobs.set(res.data);
          this.totalCount.set(res.total);
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
