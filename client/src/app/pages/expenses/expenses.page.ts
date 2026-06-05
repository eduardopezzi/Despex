import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Expense, FiscalDocumentType, PaymentType, RecordEntry, RecordType, SortOrder } from '@open-receipt-ocr/types';
import { ExpensePayload, ExpenseService } from '@services/expense.service';
import { RecordService } from '@services/record.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToastModule,
  ],
  templateUrl: './expenses.page.html',
})
export class ExpensesPageComponent implements OnInit {
  expenseService = inject(ExpenseService);
  private recordService = inject(RecordService);
  private messageService = inject(MessageService);

  first = 0;
  rows = 20;
  search = '';
  expenseDateFrom = '';
  expenseDateTo = '';
  reimbursementDateFrom = '';
  reimbursementDateTo = '';
  isReimbursed: boolean | null = null;
  clientRecordId: number | null = null;
  expenseTypeRecordId: number | null = null;

  clients: RecordEntry[] = [];
  expenseTypes: RecordEntry[] = [];
  selectedExpenses: Expense[] = [];

  showDialog = false;
  editingExpense: Expense | null = null;
  form: ExpensePayload = this.emptyForm();

  reimbursementOptions = [
    { label: 'Todas', value: null },
    { label: 'Reembolsadas', value: true },
    { label: 'Pendentes', value: false },
  ];

  paymentOptions = [
    { label: 'Desconhecido', value: PaymentType.Unknown },
    { label: 'Dinheiro', value: PaymentType.Cash },
    { label: 'Cartao empresa', value: PaymentType.CompanyCreditCard },
    { label: 'Cartao pessoal', value: PaymentType.PersonalCreditCard },
  ];

  documentOptions = [
    { label: 'Desconhecido', value: FiscalDocumentType.Unknown },
    { label: 'NF-e 55', value: FiscalDocumentType.NfeModel55 },
    { label: 'Cupom/NFC-e', value: FiscalDocumentType.ConsumerInvoice },
    { label: 'Recibo', value: FiscalDocumentType.Receipt },
  ];

  ngOnInit() {
    this.loadRecords();
    this.fetchExpenses();
  }

  fetchExpenses(showLoading = true) {
    this.expenseService.fetchExpenses(
      {
        page: Math.floor(this.first / this.rows) + 1,
        pageSize: this.rows,
        expenseDateFrom: this.expenseDateFrom || undefined,
        expenseDateTo: this.expenseDateTo || undefined,
        reimbursementDateFrom: this.reimbursementDateFrom || undefined,
        reimbursementDateTo: this.reimbursementDateTo || undefined,
        isReimbursed: this.isReimbursed === null ? undefined : this.isReimbursed,
        clientRecordId: this.clientRecordId || undefined,
        expenseTypeRecordId: this.expenseTypeRecordId || undefined,
        search: this.search || undefined,
        sortField: 'expenseDate',
        sortOrder: SortOrder.DESC,
      },
      showLoading,
    );
  }

  onFilterChange() {
    this.first = 0;
    this.fetchExpenses();
  }

  onPageChange(event: { first?: number; rows?: number }) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 20;
    this.fetchExpenses();
  }

  openCreateDialog() {
    this.editingExpense = null;
    this.form = this.emptyForm();
    this.showDialog = true;
  }

  openEditDialog(expense: Expense) {
    this.editingExpense = expense;
    this.form = {
      merchantName: expense.merchantName,
      totalAmount: expense.totalAmount,
      expenseDate: expense.expenseDate,
      paymentType: expense.paymentType,
      clientRecordId: expense.clientRecordId,
      isCompanyExpense: expense.isCompanyExpense,
      expenseTypeRecordId: expense.expenseTypeRecordId,
      reimbursementDate: expense.reimbursementDate,
      isReimbursed: expense.isReimbursed,
      description: expense.description,
      documentType: expense.documentType,
    };
    this.showDialog = true;
  }

  saveExpense() {
    const request = this.editingExpense
      ? this.expenseService.updateExpense(this.editingExpense.id, this.normalizePayload(this.form))
      : this.expenseService.createExpense(this.normalizePayload(this.form));

    request.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Despesa salva' });
        this.showDialog = false;
        this.fetchExpenses(false);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erro ao salvar despesa' }),
    });
  }

  deleteExpense(expense: Expense) {
    this.expenseService.deleteExpense(expense.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Despesa removida' });
        this.fetchExpenses(false);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erro ao remover despesa' }),
    });
  }

  clientName(id?: number | null): string {
    return this.clients.find((item) => item.id === id)?.name || '-';
  }

  expenseTypeName(id?: number | null): string {
    return this.expenseTypes.find((item) => item.id === id)?.name || '-';
  }

  paymentLabel(value?: PaymentType): string {
    return this.paymentOptions.find((item) => item.value === value)?.label || 'Desconhecido';
  }

  totalSelected(): number {
    return this.selectedExpenses.reduce((sum, expense) => sum + (expense.totalAmount || 0), 0);
  }

  private loadRecords() {
    this.recordService.listByType(RecordType.Client).subscribe((res) => (this.clients = res.data));
    this.recordService.listByType(RecordType.ExpenseType).subscribe((res) => (this.expenseTypes = res.data));
  }

  private normalizePayload(payload: ExpensePayload): ExpensePayload {
    return {
      ...payload,
      merchantName: payload.merchantName?.trim() || null,
      description: payload.description?.trim() || null,
      clientRecordId: payload.clientRecordId || null,
      expenseTypeRecordId: payload.expenseTypeRecordId || null,
      reimbursementDate: payload.reimbursementDate || null,
      expenseDate: payload.expenseDate || null,
    };
  }

  private emptyForm(): ExpensePayload {
    return {
      merchantName: '',
      totalAmount: null,
      expenseDate: null,
      paymentType: PaymentType.Unknown,
      clientRecordId: null,
      isCompanyExpense: false,
      expenseTypeRecordId: null,
      reimbursementDate: null,
      isReimbursed: false,
      description: '',
      documentType: FiscalDocumentType.Unknown,
    };
  }
}
