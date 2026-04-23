import { Component, inject, signal, effect, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfigDialogComponent } from '@components/config-dialog/config-dialog.component';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfigService } from '@services/config.service';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, ButtonModule, ConfigDialogComponent, TranslocoModule],
  templateUrl: './shell.layout.html',
})
export class ShellLayoutComponent {
  private translocoService = inject(TranslocoService);
  private configService = inject(ConfigService);

  showConfig = signal(false);

  isDark = computed(() => this.configService.theme() === 'dark');
  currentLang = computed(() => this.configService.language());
  collapsed = computed(() => this.configService.sidebarCollapsed());

  constructor() {
    effect(() => {
      const lang = this.configService.language();
      this.translocoService.setActiveLang(lang);
    });

    effect(() => {
      const theme = this.configService.theme();
      const el = document.documentElement;
      if (theme === 'dark') {
        el.classList.add('app-dark');
      } else {
        el.classList.remove('app-dark');
      }
    });
  }

  toggleDark() {
    const current = this.configService.theme();
    this.configService.theme.set(current === 'light' ? 'dark' : 'light');
    this.configService.saveConfig();
  }

  toggleLang() {
    const current = this.configService.language();
    this.configService.language.set(current === 'en' ? 'pt' : 'en');
    this.configService.saveConfig();
  }

  setCollapsed(val: boolean) {
    this.configService.sidebarCollapsed.set(val);
    this.configService.saveConfig();
  }
}
