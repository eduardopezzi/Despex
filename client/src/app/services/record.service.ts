import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { PaginatedResponse, RecordEntry, RecordType, SortOrder } from '@open-receipt-ocr/types';

export interface RecordPayload {
  name: string;
  type: RecordType;
  isActive?: boolean;
}

export interface RecordFilters {
  page?: number;
  pageSize?: number;
  type?: RecordType;
  isActive?: boolean;
  search?: string;
  sortField?: string;
  sortOrder?: SortOrder;
}

@Injectable({ providedIn: 'root' })
export class RecordService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/records`;

  records = signal<RecordEntry[]>([]);
  totalCount = signal(0);
  loading = signal(false);

  fetchRecords(filters: RecordFilters = {}, showLoading = true) {
    if (showLoading) this.loading.set(true);

    const params: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }

    return this.http
      .get<PaginatedResponse<RecordEntry>>(this.apiUrl, { params })
      .pipe(
        tap((res) => {
          this.records.set(res.data);
          this.totalCount.set(res.total);
          this.loading.set(false);
        }),
      )
      .subscribe();
  }

  listByType(type: RecordType): Observable<PaginatedResponse<RecordEntry>> {
    return this.http.get<PaginatedResponse<RecordEntry>>(this.apiUrl, { params: { type, isActive: true, pageSize: 500 } });
  }

  createRecord(payload: RecordPayload): Observable<RecordEntry> {
    return this.http.post<RecordEntry>(this.apiUrl, payload);
  }

  updateRecord(id: number, payload: Partial<RecordPayload>): Observable<RecordEntry> {
    return this.http.patch<RecordEntry>(`${this.apiUrl}/${id}`, payload);
  }

  deactivateRecord(id: number): Observable<RecordEntry> {
    return this.http.delete<RecordEntry>(`${this.apiUrl}/${id}`);
  }
}
