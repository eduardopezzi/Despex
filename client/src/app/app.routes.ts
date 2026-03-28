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
        path: 'receipts',
        loadComponent: () => import('@pages/receipts/receipts.page').then((m) => m.ReceiptsPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
