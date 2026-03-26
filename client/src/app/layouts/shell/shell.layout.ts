import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterModule, ButtonModule],
  templateUrl: './shell.layout.html',
})
export class ShellLayoutComponent {
  collapsed = signal(false);
  isDark = signal(false);

  toggleDark() {
    const el = document.documentElement;
    el.classList.toggle('app-dark');
    this.isDark.set(el.classList.contains('app-dark'));
  }
}
