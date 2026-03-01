import { Injectable, Signal, signal } from '@angular/core';
import { ConversionStatus } from '../models/conversion-state.model';
import { ProcessingSummary } from '../models/processing-result.model';

@Injectable({ providedIn: 'root' })
export class ConversionStateService {
  private readonly _status = signal<ConversionStatus>('idle');
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _processingSummary = signal<ProcessingSummary | null>(null);

  readonly status: Signal<ConversionStatus> = this._status.asReadonly();
  readonly errorMessage: Signal<string | null> = this._errorMessage.asReadonly();
  readonly processingSummary: Signal<ProcessingSummary | null> = this._processingSummary.asReadonly();

  startProcessing(): void {
    this._errorMessage.set(null);
    this._processingSummary.set(null);
    this._status.set('loading');
  }

  setSuccess(summary: ProcessingSummary): void {
    this._errorMessage.set(null);
    this._processingSummary.set(summary);
    this._status.set('success');
  }

  setError(message: string): void {
    this._processingSummary.set(null);
    this._errorMessage.set(message);
    this._status.set('error');
  }

  reset(): void {
    this._errorMessage.set(null);
    this._processingSummary.set(null);
    this._status.set('idle');
  }
}
