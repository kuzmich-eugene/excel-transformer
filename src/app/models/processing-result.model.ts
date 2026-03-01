export interface ExportFiles {
  basicCatalog: Uint8Array;
  extendedCatalog: Uint8Array;
  batumiReceipt: Uint8Array;
}

export interface ProcessingSummary {
  totalRowsInSheet: number;
  skippedRows: number;
  exportedRows: number;
}

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor() {
    super('Unsupported file type. Please upload a .xls file.');
    this.name = 'UnsupportedFileTypeError';
  }
}

export class MissingSheetError extends AppError {
  constructor() {
    super("The file is missing the required 'Спецификация' sheet.");
    this.name = 'MissingSheetError';
  }
}

export class MissingColumnsError extends AppError {
  readonly missingColumns: string[];

  constructor(missingColumns: string[]) {
    super(`The file is missing required columns: ${missingColumns.join(', ')}.`);
    this.name = 'MissingColumnsError';
    this.missingColumns = missingColumns;
  }
}

export class ProcessingError extends AppError {
  constructor(cause?: unknown) {
    super('An unexpected error occurred during processing. Please try again.');
    this.name = 'ProcessingError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
