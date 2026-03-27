import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfigDialogComponent } from '@components/config-dialog/config-dialog.component';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, ButtonModule, ConfigDialogComponent, TranslocoModule],
  templateUrl: './shell.layout.html',
})
export class ShellLayoutComponent {
  collapsed = signal(false);
  isDark = signal(false);
  showConfig = signal(false);

  toggleDark() {
    const el = document.documentElement;
    el.classList.toggle('app-dark');
    this.isDark.set(el.classList.contains('app-dark'));
  }
}
