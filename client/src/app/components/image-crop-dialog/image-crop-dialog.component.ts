import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, ImageCropperComponent, TranslocoModule],
  templateUrl: './image-crop-dialog.component.html',
})
export class ImageCropDialogComponent {
  @Input() visible = false;
  @Input() file: File | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cropped = new EventEmitter<File>();

  private latestBlob = signal<Blob | null>(null);

  onCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.latestBlob.set(event.blob);
    }
  }

  apply() {
    const blob = this.latestBlob();
    if (!blob || !this.file) {
      this.close();
      return;
    }
    const originalName = this.file.name;
    const newFile = new File([blob], originalName, { type: 'image/jpeg' });
    this.cropped.emit(newFile);
    this.reset();
    this.visibleChange.emit(false);
  }

  close() {
    this.reset();
    this.visibleChange.emit(false);
  }

  private reset() {
    this.latestBlob.set(null);
  }
}
