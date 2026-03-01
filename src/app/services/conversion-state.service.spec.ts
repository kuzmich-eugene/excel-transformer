import { TestBed } from '@angular/core/testing';
import { ConversionStateService } from './conversion-state.service';
import { ProcessingSummary } from '../models/processing-result.model';

describe('ConversionStateService', () => {
  let service: ConversionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConversionStateService);
  });

  it('should start in idle state', () => {
    expect(service.status()).toBe('idle');
    expect(service.errorMessage()).toBeNull();
    expect(service.processingSummary()).toBeNull();
  });

  describe('startProcessing()', () => {
    it('transitions status to loading', () => {
      service.startProcessing();
      expect(service.status()).toBe('loading');
    });

    it('clears previous error message', () => {
      service.setError('some error');
      service.startProcessing();
      expect(service.errorMessage()).toBeNull();
    });

    it('clears previous summary', () => {
      const summary: ProcessingSummary = { totalRowsInSheet: 5, skippedRows: 0, exportedRows: 5 };
      service.setSuccess(summary);
      service.startProcessing();
      expect(service.processingSummary()).toBeNull();
    });
  });

  describe('setSuccess()', () => {
    it('transitions status to success', () => {
      service.startProcessing();
      const summary: ProcessingSummary = { totalRowsInSheet: 10, skippedRows: 2, exportedRows: 8 };
      service.setSuccess(summary);
      expect(service.status()).toBe('success');
    });

    it('stores the processing summary', () => {
      const summary: ProcessingSummary = { totalRowsInSheet: 10, skippedRows: 2, exportedRows: 8 };
      service.setSuccess(summary);
      expect(service.processingSummary()).toEqual(summary);
    });

    it('clears any previous error message', () => {
      service.setError('old error');
      service.setSuccess({ totalRowsInSheet: 1, skippedRows: 0, exportedRows: 1 });
      expect(service.errorMessage()).toBeNull();
    });
  });

  describe('setError()', () => {
    it('transitions status to error', () => {
      service.setError('Something went wrong');
      expect(service.status()).toBe('error');
    });

    it('stores the error message', () => {
      service.setError('File is missing the sheet');
      expect(service.errorMessage()).toBe('File is missing the sheet');
    });

    it('clears any previous summary', () => {
      service.setSuccess({ totalRowsInSheet: 5, skippedRows: 0, exportedRows: 5 });
      service.setError('oops');
      expect(service.processingSummary()).toBeNull();
    });
  });

  describe('reset()', () => {
    it('returns status to idle from error', () => {
      service.setError('some error');
      service.reset();
      expect(service.status()).toBe('idle');
    });

    it('returns status to idle from success', () => {
      service.setSuccess({ totalRowsInSheet: 3, skippedRows: 0, exportedRows: 3 });
      service.reset();
      expect(service.status()).toBe('idle');
    });

    it('clears error message', () => {
      service.setError('msg');
      service.reset();
      expect(service.errorMessage()).toBeNull();
    });

    it('clears processing summary', () => {
      service.setSuccess({ totalRowsInSheet: 1, skippedRows: 0, exportedRows: 1 });
      service.reset();
      expect(service.processingSummary()).toBeNull();
    });
  });
});
