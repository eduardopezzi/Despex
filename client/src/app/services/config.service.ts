import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OcrProvider, OcrProviderAvailability } from '@open-receipt-ocr/types';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);

  defaultOcrProvider = signal<OcrProvider | undefined>(undefined);
  availableOcrProviders = signal<OcrProvider[]>([]);
  defaultOutputs = signal<string[]>(['db']);
  language = signal<string>('pt');
  theme = signal<'light' | 'dark'>('light');
  sidebarCollapsed = signal<boolean>(false);

  private storageKey = 'despex-config';
  private legacyStorageKey = 'open-receipt-ocr-config';

  constructor() {
    this.loadConfig();
    this.loadAvailableOcrProviders();
  }

  loadConfig() {
    const data = localStorage.getItem(this.storageKey) || localStorage.getItem(this.legacyStorageKey);
    if (data) {
      try {
        const config = JSON.parse(data) as {
          defaultOcrProvider?: OcrProvider;
          defaultOutputs?: string[];
          language?: string;
          theme?: 'light' | 'dark';
          sidebarCollapsed?: boolean;
        };
        if (config.defaultOcrProvider) this.defaultOcrProvider.set(config.defaultOcrProvider);
        if (config.defaultOutputs) this.defaultOutputs.set(config.defaultOutputs);
        if (localStorage.getItem(this.storageKey) && config.language) this.language.set(config.language);
        if (config.theme) this.theme.set(config.theme);
        if (config.sidebarCollapsed !== undefined) this.sidebarCollapsed.set(config.sidebarCollapsed);
      } catch (err) {
        console.error('Failed to parse config from localStorage', err);
      }
    }
  }

  saveConfig() {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        defaultOcrProvider: this.defaultOcrProvider(),
        defaultOutputs: this.defaultOutputs(),
        language: this.language(),
        theme: this.theme(),
        sidebarCollapsed: this.sidebarCollapsed(),
      }),
    );
  }

  loadAvailableOcrProviders() {
    this.http.get<OcrProviderAvailability>(`${environment.apiUrl}/config/ocr-providers`).subscribe({
      next: (config) => {
        const providers = config.availableProviders || [];
        this.availableOcrProviders.set(providers);
        const currentDefault = this.defaultOcrProvider();
        if (currentDefault && !providers.includes(currentDefault)) {
          this.defaultOcrProvider.set(providers[0]);
          this.saveConfig();
        }
      },
      error: () => {
        this.availableOcrProviders.set([]);
        this.defaultOcrProvider.set(undefined);
      },
    });
  }
}
