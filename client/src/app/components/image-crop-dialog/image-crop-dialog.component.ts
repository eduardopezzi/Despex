import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ImageCropperComponent, ImageCroppedEvent, ImageTransform, CropperPosition } from 'ngx-image-cropper';
import { TranslocoModule } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonGroupModule } from 'primeng/buttongroup';

@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, ImageCropperComponent, TranslocoModule, TooltipModule, ButtonGroupModule],
  templateUrl: './image-crop-dialog.component.html',
})
export class ImageCropDialogComponent {
  @Input() visible = false;
  @Input() file: File | null = null;
  @Input() set initialTransform(val: ImageTransform | null) {
    if (val) {
      this.transform.set(val);
    } else {
      this.transform.set({ scale: 1, rotate: 0, flipH: false, flipV: false });
    }
  }
  @Input() initialCropper: CropperPosition | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cropped = new EventEmitter<{ file: File; transform: ImageTransform; cropper: CropperPosition }>();

  private latestBlob = signal<Blob | null>(null);
  private latestCropper = signal<CropperPosition | null>(null);
  transform = signal<ImageTransform>({
    scale: 1,
    rotate: 0,
    flipH: false,
    flipV: false,
  });

  rotate(degrees: number) {
    this.transform.update((t: ImageTransform) => ({ ...t, rotate: (t.rotate ?? 0) + degrees }));
  }

  zoom(delta: number) {
    this.transform.update((t: ImageTransform) => ({ ...t, scale: Math.max(0.1, Math.min(5, (t.scale ?? 1) + delta)) }));
  }

  flipH() {
    this.transform.update((t: ImageTransform) => ({ ...t, flipH: !t.flipH }));
  }

  flipV() {
    this.transform.update((t: ImageTransform) => ({ ...t, flipV: !t.flipV }));
  }

  onCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.latestBlob.set(event.blob);
    }
    if (event.cropperPosition) {
      this.latestCropper.set(event.cropperPosition);
    }
  }

  apply() {
    const blob = this.latestBlob();
    const cropper = this.latestCropper();
    if (!blob || !cropper || !this.file) {
      this.close();
      return;
    }
    const originalName = this.file.name;
    const newFile = new File([blob], originalName, { type: 'image/jpeg' });
    this.cropped.emit({ file: newFile, transform: this.transform(), cropper });
    this.visibleChange.emit(false);
  }

  close() {
    this.visibleChange.emit(false);
  }
}
