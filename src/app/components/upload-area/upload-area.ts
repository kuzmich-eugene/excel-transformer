import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ConversionStateService } from '../../services/conversion-state.service';
import { InvoiceProcessorService } from '../../services/invoice-processor.service';
import { AppError } from '../../models/processing-result.model';

@Component({
  selector: 'app-upload-area',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upload-area.html',
})
export class UploadAreaComponent {
  private readonly state = inject(ConversionStateService);
  private readonly processor = inject(InvoiceProcessorService);

  protected readonly isDragOver = signal(false);
  protected readonly isLoading = this.state.status;

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      void this.handleFile(file);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.handleFile(file);
    }
    input.value = '';
  }

  private async handleFile(file: File): Promise<void> {
    const current = this.state.status();
    if (current === 'success' || current === 'error') {
      this.state.reset();
    }
    this.state.startProcessing();
    try {
      const summary = await this.processor.processFile(file);
      this.state.setSuccess(summary);
    } catch (err) {
      const message = err instanceof AppError
        ? err.message
        : 'An unexpected error occurred. Please try again.';
      this.state.setError(message);
    }
  }
}
