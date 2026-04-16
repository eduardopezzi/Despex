import { Injectable, signal } from '@angular/core';
import { OcrProvider } from '@open-receipt-ocr/types';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  defaultOcrProvider = signal<OcrProvider | undefined>(undefined);
  defaultOutputs = signal<string[]>(['markdown']);

  private storageKey = 'open-receipt-ocr-config';

  constructor() {
    this.loadConfig();
  }

  loadConfig() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const config = JSON.parse(data) as { defaultOcrProvider?: OcrProvider; defaultOutputs?: string[] };
        if (config.defaultOcrProvider) this.defaultOcrProvider.set(config.defaultOcrProvider);
        if (config.defaultOutputs) this.defaultOutputs.set(config.defaultOutputs);
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
      }),
    );
  }
}
