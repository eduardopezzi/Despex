import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { OcrProvider } from '@models/receipt.model';
import { ConfigService } from '@services/config.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, SelectModule, FormsModule, TranslocoModule],
  templateUrl: './config-dialog.component.html',
})
export class ConfigDialogComponent {
  configService: ConfigService = inject(ConfigService);
  private translocoService = inject(TranslocoService);

  // Expose visible as a signal so effect() can watch it
  visibleSig = signal(false);

  @Input() set visible(v: boolean) {
    this.visibleSig.set(v);
  }

  get visible() {
    return this.visibleSig();
  }

  @Output() visibleChange = new EventEmitter<boolean>();

  @ViewChild('arrowContainer') containerEl!: ElementRef<HTMLElement>;

  arrows = signal<{ d: string; key: string }[]>([]);

  constructor() {
    effect(() => {
      // Subscribe to signals that affect arrow positions
      this.visibleSig();
      this.configService.defaultOcrProvider();
      this.configService.defaultOutputs();
      // Schedule after DOM update
      setTimeout(() => this.updateArrows(), 60);
    });
  }

  get ocrOptions() {
    return [
      {
        label: this.translocoService.translate('config.providers.mistral'),
        value: OcrProvider.Mistral,
        icon: 'pi pi-sparkles',
      },
      {
        label: this.translocoService.translate('config.providers.azure'),
        value: OcrProvider.Azure,
        icon: 'pi pi-cloud',
        disabled: true,
      },
      {
        label: this.translocoService.translate('config.providers.aws'),
        value: OcrProvider.Aws,
        icon: 'pi pi-microchip',
        disabled: true,
      },
      {
        label: this.translocoService.translate('config.providers.tabscanner'),
        value: OcrProvider.TabScanner,
        icon: 'pi pi-bolt',
      },
      { label: this.translocoService.translate('config.providers.ask'), value: 'ask', icon: 'pi pi-question-circle' },
    ];
  }

  get outputOptions() {
    return [
      { label: this.translocoService.translate('config.outputs.markdown'), value: 'markdown', icon: 'pi pi-download' },
      { label: this.translocoService.translate('config.outputs.clipboard'), value: 'clipboard', icon: 'pi pi-copy' },
      { label: this.translocoService.translate('config.outputs.n8n'), value: 'n8n', icon: 'pi pi-send' },
      { label: this.translocoService.translate('config.outputs.api'), value: 'api', icon: 'pi pi-code', disabled: true },
    ];
  }

  updateArrows() {
    if (!this.visible) {
      this.arrows.set([]);
      return;
    }
    const container = this.containerEl?.nativeElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (!containerRect.width) return;

    const allArrows: { d: string; key: string }[] = [];

    // ── Arrow 1: Input → selected OCR Provider ──────────────────
    const inputEl = container.querySelector<HTMLElement>('[data-input-node]');
    const selectedProviderEl = container.querySelector<HTMLElement>('[data-sel-provider]');

    if (inputEl && selectedProviderEl) {
      const inRect = inputEl.getBoundingClientRect();
      const prvRect = selectedProviderEl.getBoundingClientRect();

      const x1 = inRect.right - containerRect.left + 2;
      const y1 = inRect.top + inRect.height / 2 - containerRect.top;
      const x2 = prvRect.left - containerRect.left - 2;
      const y2 = prvRect.top + prvRect.height / 2 - containerRect.top;
      const cpX = x1 + (x2 - x1) * 0.45;

      allArrows.push({
        d: `M ${x1} ${y1} C ${cpX} ${y1} ${cpX} ${y2} ${x2} ${y2}`,
        key: 'input-provider',
      });
    }

    // ── Arrows: selected OCR Provider → each selected Output ────
    if (selectedProviderEl) {
      const provRect = selectedProviderEl.getBoundingClientRect();
      const startX = provRect.right - containerRect.left + 2;
      const startY = provRect.top + provRect.height / 2 - containerRect.top;

      const selectedOutputEls = Array.from(container.querySelectorAll<HTMLElement>('[data-sel-output]'));
      selectedOutputEls.forEach((el) => {
        const outRect = el.getBoundingClientRect();
        const endX = outRect.left - containerRect.left - 2;
        const endY = outRect.top + outRect.height / 2 - containerRect.top;
        const cpX = startX + (endX - startX) * 0.45;
        allArrows.push({
          d: `M ${startX} ${startY} C ${cpX} ${startY} ${cpX} ${endY} ${endX} ${endY}`,
          key: `provider-${el.getAttribute('data-output-val') ?? ''}`,
        });
      });
    }

    this.arrows.set(allArrows);
  }

  setOcrProvider(value: OcrProvider | 'ask') {
    this.configService.defaultOcrProvider.set(value);
  }

  toggleOutput(value: string) {
    const current = this.configService.defaultOutputs() as string[];
    if (current.includes(value)) {
      this.configService.defaultOutputs.set(current.filter((v) => v !== value));
    } else {
      this.configService.defaultOutputs.set([...current, value]);
    }
  }

  isOutputSelected(value: string): boolean {
    return (this.configService.defaultOutputs() as string[]).includes(value);
  }

  close() {
    this.visibleChange.emit(false);
  }

  save() {
    this.configService.saveConfig();
    this.close();
  }
}
