import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecordEntry, RecordType, SortOrder } from '@open-receipt-ocr/types';
import { RecordPayload, RecordService } from '@services/record.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-records-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
  ],
  templateUrl: './records.page.html',
})
export class RecordsPageComponent implements OnInit {
  recordService = inject(RecordService);
  private messageService = inject(MessageService);

  RecordType = RecordType;

  first = 0;
  rows = 20;
  search = '';
  filterType: RecordType | null = null;
  filterActive: boolean | null = true;

  showDialog = false;
  editingRecord: RecordEntry | null = null;
  form: RecordPayload = this.emptyForm();

  typeOptions = [
    { label: 'Todos', value: null },
    { label: 'Cliente', value: RecordType.Client },
    { label: 'Tipo de gasto', value: RecordType.ExpenseType },
  ];

  activeOptions = [
    { label: 'Ativos', value: true },
    { label: 'Inativos', value: false },
    { label: 'Todos', value: null },
  ];

  ngOnInit() {
    this.fetchRecords();
  }

  fetchRecords(showLoading = true) {
    this.recordService.fetchRecords(
      {
        page: Math.floor(this.first / this.rows) + 1,
        pageSize: this.rows,
        type: this.filterType || undefined,
        isActive: this.filterActive === null ? undefined : this.filterActive,
        search: this.search || undefined,
        sortField: 'name',
        sortOrder: SortOrder.ASC,
      },
      showLoading,
    );
  }

  onFilterChange() {
    this.first = 0;
    this.fetchRecords();
  }

  onPageChange(event: { first?: number; rows?: number }) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 20;
    this.fetchRecords();
  }

  openCreateDialog() {
    this.editingRecord = null;
    this.form = this.emptyForm();
    this.showDialog = true;
  }

  openEditDialog(record: RecordEntry) {
    this.editingRecord = record;
    this.form = {
      name: record.name,
      type: record.type,
      isActive: record.isActive,
    };
    this.showDialog = true;
  }

  saveRecord() {
    const payload = {
      ...this.form,
      name: this.form.name.trim(),
    };

    const request = this.editingRecord ? this.recordService.updateRecord(this.editingRecord.id, payload) : this.recordService.createRecord(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Cadastro salvo' });
        this.showDialog = false;
        this.fetchRecords(false);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erro ao salvar cadastro' }),
    });
  }

  deactivate(record: RecordEntry) {
    this.recordService.deactivateRecord(record.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Cadastro desativado' });
        this.fetchRecords(false);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erro ao desativar cadastro' }),
    });
  }

  typeLabel(type: RecordType): string {
    return type === RecordType.Client ? 'Cliente' : 'Tipo de gasto';
  }

  private emptyForm(): RecordPayload {
    return {
      name: '',
      type: RecordType.Client,
      isActive: true,
    };
  }
}
