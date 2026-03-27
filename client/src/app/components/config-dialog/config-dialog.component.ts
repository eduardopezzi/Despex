import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { OcrProvider } from '@models/receipt.model';
import { ConfigService } from '@services/config.service';

import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, SelectModule, FormsModule, TranslocoModule],
  templateUrl: './config-dialog.component.html',
})
export class ConfigDialogComponent {
  configService: ConfigService = inject(ConfigService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  ocrOptions = [
    { label: 'Mistral OCR', value: OcrProvider.MISTRAL, icon: 'pi pi-sparkles' },
    { label: 'Azure OCR', value: OcrProvider.AZURE, icon: 'pi pi-cloud', disabled: true },
    { label: 'AWS TextExtract', value: OcrProvider.AWS, icon: 'pi pi-aws', disabled: true },
    { label: 'Ask each time', value: 'ask', icon: 'pi pi-question-circle' }
  ];

  outputOptions = [
    { label: 'Download Markdown', value: 'markdown', icon: 'pi pi-download' },
    { label: 'Copy to Clipboard', value: 'clipboard', icon: 'pi pi-copy' },
    { label: 'Send to n8n', value: 'n8n', icon: 'pi pi-send' },
    { label: 'REST API', value: 'api', icon: 'pi pi-code', disabled: true }
  ];

  setOcrProvider(value: OcrProvider | 'ask') {
    this.configService.defaultOcrProvider.set(value);
  }

  toggleOutput(value: string) {
    const current = this.configService.defaultOutputs() as string[];
    if (current.includes(value)) {
      this.configService.defaultOutputs.set(current.filter((v: string) => v !== value));
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
