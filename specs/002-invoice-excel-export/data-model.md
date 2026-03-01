# Data Model: Wholesale Invoice to Excel Export Converter

**Branch**: `002-invoice-excel-export` | **Date**: 2026-03-01

---

## Overview

All data exists transiently in memory for the duration of a single conversion session.
Nothing is persisted. The flow is: `File → WorkbookParseResult → InvoiceRow[] →
ExportFiles → ZIP Blob → browser download`.

---

## Source Column Mapping

The following table maps source columns in "Спецификация" to their internal model fields
and the output columns they populate.

| Source Column   | Internal Field    | basic-catalog column  | extended-catalog column              | batumi-receipt column |
|-----------------|-------------------|-----------------------|--------------------------------------|-----------------------|
| Код ЕАН         | `eanCode`         | Код                   | Код + Штрихкод                       | კოდი                  |
| Модель          | `model`           | Артикул               | Артикул                              | —                     |
| Артикул         | `article`         | —                     | არТиკული2                            | —                     |
| Наименование    | `name`            | Название (Title Case) | Название (Title Case) + Описание     | —                     |
| Размер          | `size`            | Размер                | Размер                               | —                     |
| Размер (евро)   | `euroSize`        | Размер (евр)          | Размер (евр)                         | —                     |
| Параметры       | `parameters`      | Цвет                  | Цвет                                 | —                     |
| Кол-во          | `quantity`        | —                     | —                                    | რაოდენობა             |
| Цена            | `purchasePrice`   | —                     | —                                    | თვითღირებულება        |
| *(computed)*    | `retailPrice`     | საცალო Розничный      | საცალო Розничный                     | —                     |

---

## Core Interfaces

### `InvoiceRow`

Represents one parsed and validated data row from "Спецификация". Rows with empty
`eanCode` are excluded before this interface is populated.

```typescript
interface InvoiceRow {
  eanCode: string;           // Код ЕАН — primary key for EAN-sorted output
  model: string;             // Модель — used as numeric article in catalog output
  article: string;           // Артикул — string article in extended catalog
  name: string;              // Наименование — raw value; Title Case applied at output time
  size: string;              // Размер
  euroSize: string;          // Размер (евро)
  parameters: string;        // Параметры → Цвет output column
  quantity: number;          // Кол-во
  purchasePrice: number;     // Цена
  wholesaleMarkup: number;   // Опт. надб., % — parsed, not used in output (reserved)
  retailPrice: number;       // Computed: Math.round(purchasePrice * 7.85)
}
```

### `ExportFiles`

The three generated `.xlsx` files as byte arrays, ready for ZIPing.

```typescript
interface ExportFiles {
  basicCatalog: Uint8Array;     // basic-catalog.xlsx
  extendedCatalog: Uint8Array;  // extended-catalog.xlsx
  batumiReceipt: Uint8Array;    // batumi-receipt.xlsx
}
```

### `ProcessingSummary`

Returned from `InvoiceProcessorService.processFile()` on success. Used to populate
the success message in the UI.

```typescript
interface ProcessingSummary {
  totalRowsInSheet: number;   // Raw row count in "Спецификация" (excluding header)
  skippedRows: number;        // Rows excluded due to empty Код ЕАН
  exportedRows: number;       // Rows included in output (totalRowsInSheet - skippedRows)
}
```

---

## State Model

### `ConversionStatus`

```typescript
type ConversionStatus = 'idle' | 'loading' | 'success' | 'error';
```

| Value | Meaning | UI State |
|-------|---------|----------|
| `'idle'` | No file uploaded yet; awaiting user action | Upload zone visible, no message |
| `'loading'` | File accepted; processing in progress | Loading spinner; upload zone disabled |
| `'success'` | ZIP downloaded successfully | Success message with row summary |
| `'error'` | Validation or processing failed | Error message; upload zone re-enabled |

---

## Error Types

All errors thrown by `InvoiceProcessorService` extend a base `AppError` class. The
component catches them and delegates the human-readable message to
`ConversionStateService.setError()`.

```typescript
class AppError extends Error {
  constructor(message: string) { super(message); }
}

class UnsupportedFileTypeError extends AppError {
  // message: "Unsupported file type. Please upload a .xls file."
}

class MissingSheetError extends AppError {
  // message: "The file is missing the required 'Спецификация' sheet."
}

class MissingColumnsError extends AppError {
  readonly missingColumns: string[];
  // message: "The file is missing required columns: <names>."
}

class ProcessingError extends AppError {
  // message: "An unexpected error occurred during processing. Please try again."
}
```

---

## Output File Schemas

### basic-catalog.xlsx — Sheet "Лист1"

| # | Column Header       | Source Field     | Transformation         |
|---|---------------------|------------------|------------------------|
| 1 | Код                 | `eanCode`        | Verbatim               |
| 2 | Название            | `name`           | Title Case             |
| 3 | საცალო Розничный    | `retailPrice`    | Whole number           |
| 4 | Размер              | `size`           | Verbatim               |
| 5 | Размер (евр)        | `euroSize`       | Verbatim               |
| 6 | Цвет                | `parameters`     | Verbatim               |
| 7 | Артикул             | `model`          | Verbatim               |

**Sort**: `model` ascending (numeric collation), then `size` ascending (numeric collation).

### extended-catalog.xlsx — Sheet "Лист1"

All 7 columns from basic-catalog.xlsx, then:

| # | Column Header | Source Field  | Transformation |
|---|---------------|---------------|----------------|
| 8 | არТиკული2     | `article`     | Verbatim       |
| 9 | Штрихкод      | `eanCode`     | Verbatim (duplicate of Код) |
| 10 | Описание      | `name`        | Title Case     |

**Sort**: Same as basic-catalog.xlsx.

### batumi-receipt.xlsx — Sheet "ნიმუში"

| # | Column Header        | Source Field    | Transformation |
|---|----------------------|-----------------|----------------|
| 1 | კოდი                 | `eanCode`       | Verbatim       |
| 2 | რაოდენობა            | `quantity`      | Verbatim       |
| 3 | თვითღირებულება       | `purchasePrice` | Verbatim       |

**Sort**: `eanCode` ascending (numeric collation).

---

## State Transitions

```
idle
 │
 ├─(user uploads file)──► loading
 │                            │
 │                   ┌────────┴────────┐
 │                   ▼                 ▼
 │                success           error
 │                   │                 │
 └───────────────────┴─────────────────┘
       (user uploads new file → back to loading)
```

The `reset()` call on `ConversionStateService` returns state to `idle` and is triggered
when the upload zone receives a new file while in `success` or `error` state.
