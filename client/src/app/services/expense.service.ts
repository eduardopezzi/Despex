import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { Expense, FiscalDocumentType, PaginatedResponse, PaymentType, SortOrder } from '@open-receipt-ocr/types';

export interface ExpensePayload {
  merchantName?: string | null;
  totalAmount?: number | null;
  expenseDate?: string | null;
  paymentType?: PaymentType;
  clientRecordId?: number | null;
  isCompanyExpense?: boolean;
  expenseTypeRecordId?: number | null;
  reimbursementDate?: string | null;
  isReimbursed?: boolean;
  description?: string | null;
  documentType?: FiscalDocumentType;
}

export interface ExpenseFilters {
  page?: number;
  pageSize?: number;
  expenseDateFrom?: string;
  expenseDateTo?: string;
  isReimbursed?: boolean;
  reimbursementDateFrom?: string;
  reimbursementDateTo?: string;
  clientRecordId?: number;
  expenseTypeRecordId?: number;
  search?: string;
  sortField?: string;
  sortOrder?: SortOrder;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/expenses`;

  expenses = signal<Expense[]>([]);
  totalCount = signal(0);
  loading = signal(false);

  fetchExpenses(filters: ExpenseFilters = {}, showLoading = true) {
    if (showLoading) this.loading.set(true);

    const params: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }

    return this.http
      .get<PaginatedResponse<Expense>>(this.apiUrl, { params })
      .pipe(
        tap((res) => {
          this.expenses.set(res.data);
          this.totalCount.set(res.total);
          this.loading.set(false);
        }),
      )
      .subscribe();
  }

  createExpense(payload: ExpensePayload): Observable<Expense> {
    return this.http.post<Expense>(this.apiUrl, payload);
  }

  updateExpense(id: number, payload: ExpensePayload): Observable<Expense> {
    return this.http.patch<Expense>(`${this.apiUrl}/${id}`, payload);
  }

  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
