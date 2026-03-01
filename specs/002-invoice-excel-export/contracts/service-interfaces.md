# Service Interface Contracts

**Branch**: `002-invoice-excel-export` | **Date**: 2026-03-01

This document defines the TypeScript interfaces for the two services that form the
application's logic layer. These contracts govern what `InvoiceProcessorService` and
`ConversionStateService` expose to components and to each other.

---

## `InvoiceProcessorService`

**Location**: `src/app/services/invoice-processor.service.ts`
**Scope**: `Injectable({ providedIn: 'root' })` — singleton, stateless
**Purpose**: Accepts a raw `File`, validates it, parses it, generates three `.xlsx`
exports, packages them into a ZIP, and triggers a browser download. Returns a
`ProcessingSummary` on success; throws a typed `AppError` subclass on any failure.

```typescript
@Injectable({ providedIn: 'root' })
class InvoiceProcessorService {
  /**
   * Entry point. Validates the file, parses the invoice, generates the three
   * export files, creates and downloads the ZIP archive.
   *
   * @throws UnsupportedFileTypeError — file is not .xls
   * @throws MissingSheetError        — "Спецификация" sheet absent
   * @throws MissingColumnsError      — one or more required columns absent
   * @throws ProcessingError          — any other unexpected failure
   */
  processFile(file: File): Promise<ProcessingSummary>;
}
```

### Internal method breakdown (private, not contracted)

| Method | Responsibility |
|--------|---------------|
| `validateFileType(file)` | Rejects non-.xls by MIME type and extension |
| `parseWorkbook(buffer)` | Calls `XLSX.read`; validates sheet and columns |
| `parseRows(sheet)` | Maps SheetJS row objects to `InvoiceRow[]`; skips empty EAN |
| `buildBasicCatalog(rows)` | Sorts rows; builds AOA; calls `XLSX.write`; returns `Uint8Array` |
| `buildExtendedCatalog(rows)` | Same pattern, adds 3 extra columns |
| `buildBatumiReceipt(rows)` | Sorts rows by EAN; builds AOA; calls `XLSX.write`; returns `Uint8Array` |
| `downloadZip(files, sourceFileName)` | JSZip bundle + Blob URL download |
| `toTitleCase(value)` | Pure string transformation |
| `calcRetailPrice(purchasePrice)` | `Math.round(price * 7.85)` |

---

## `ConversionStateService`

**Location**: `src/app/services/conversion-state.service.ts`
**Scope**: `Injectable({ providedIn: 'root' })` — singleton, stateful via signals
**Purpose**: Holds the current conversion status, error message, and processing summary
as Angular Signals. Components read signals; the `UploadAreaComponent` calls mutating
methods after `processFile()` resolves or rejects.

```typescript
@Injectable({ providedIn: 'root' })
class ConversionStateService {
  // ── Read-only signals (consumed by components) ──────────────────────────────

  /** Current processing state. Drives loading indicator and message visibility. */
  readonly status: Signal<ConversionStatus>;

  /** Human-readable error message. Non-null only when status === 'error'. */
  readonly errorMessage: Signal<string | null>;

  /**
   * Summary of the last successful conversion.
   * Non-null only when status === 'success'.
   */
  readonly processingSummary: Signal<ProcessingSummary | null>;

  // ── Mutating methods (called by UploadAreaComponent only) ───────────────────

  /** Transitions to 'loading'. Clears previous error and summary. */
  startProcessing(): void;

  /**
   * Transitions to 'success'. Stores the summary.
   * @param summary — from InvoiceProcessorService.processFile()
   */
  setSuccess(summary: ProcessingSummary): void;

  /**
   * Transitions to 'error'. Stores the error message.
   * @param message — from AppError.message
   */
  setError(message: string): void;

  /**
   * Returns state to 'idle'. Called when a new file is dropped while
   * status is 'success' or 'error', before startProcessing().
   */
  reset(): void;
}
```

---

## `UploadAreaComponent` Output Contract

**Location**: `src/app/components/upload-area/upload-area.ts`
**Purpose**: Emits the selected/dropped `File` to the parent. All processing is
triggered by `AppComponent` (or `UploadAreaComponent` itself via injected services).

```typescript
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
class UploadAreaComponent {
  /**
   * Emits once per user file selection (click or drop).
   * The component itself does not call InvoiceProcessorService directly;
   * processing is triggered internally after emitting.
   *
   * Design note: In this single-page app, UploadAreaComponent injects both
   * services and handles the full async flow internally, keeping AppComponent
   * as a thin shell. This avoids prop-drilling for a deeply-nested interaction.
   */
  readonly fileSelected = output<File>();
}
```

---

## `StatusMessageComponent` Input Contract

**Location**: `src/app/components/status-message/status-message.ts`
**Purpose**: Reads `ConversionStateService` signals and renders the appropriate
loading / success / error / row-count message. No inputs from parent — reads the
service directly.

```typescript
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
class StatusMessageComponent {
  // Reads ConversionStateService via inject() — no @Input() needed
  // Renders:
  //   loading  → spinner + "Processing your invoice..."
  //   success  → "✓ Download started — N rows exported (M skipped)"
  //   error    → error message with retry prompt
  //   idle     → nothing rendered
}
```

---

## Dependency Direction

```
AppComponent
 ├─ UploadAreaComponent
 │    ├─ inject(InvoiceProcessorService)
 │    └─ inject(ConversionStateService)
 └─ StatusMessageComponent
      └─ inject(ConversionStateService)

InvoiceProcessorService  (no Angular dependencies — plain async TypeScript)
ConversionStateService   (no Angular dependencies except signal() import)
```
