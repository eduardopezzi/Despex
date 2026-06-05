import { Routes } from '@angular/router';
import { ShellLayoutComponent } from '@layouts/shell/shell.layout';

export const routes: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('@pages/home/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'ocr-jobs',
        loadComponent: () => import('@pages/ocr-jobs/ocr-jobs.page').then((m) => m.OcrJobsPageComponent),
      },
      {
        path: 'expenses',
        loadComponent: () => import('@pages/expenses/expenses.page').then((m) => m.ExpensesPageComponent),
      },
      {
        path: 'records',
        loadComponent: () => import('@pages/records/records.page').then((m) => m.RecordsPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
