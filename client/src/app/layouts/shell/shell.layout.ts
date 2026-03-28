import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfigDialogComponent } from '@components/config-dialog/config-dialog.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, ButtonModule, ConfigDialogComponent, TranslocoModule],
  templateUrl: './shell.layout.html',
})
export class ShellLayoutComponent {
  private translocoService = inject(TranslocoService);

  collapsed = signal(false);
  isDark = signal(false);
  showConfig = signal(false);
  currentLang = signal(this.translocoService.getActiveLang());

  toggleDark() {
    const el = document.documentElement;
    el.classList.toggle('app-dark');
    this.isDark.set(el.classList.contains('app-dark'));
  }

  toggleLang() {
    const next = this.currentLang() === 'en' ? 'pt' : 'en';
    this.translocoService.setActiveLang(next);
    this.currentLang.set(next);
  }
}
