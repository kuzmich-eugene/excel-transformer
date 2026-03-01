# Research: Wholesale Invoice to Excel Export Converter

**Branch**: `002-invoice-excel-export` | **Date**: 2026-03-01
**Purpose**: Resolve all technical unknowns before Phase 1 design

---

## 1. SheetJS (`xlsx`) in the Browser

**Decision**: Use SheetJS Community Edition (`xlsx` npm package) for both reading `.xls`
input and writing `.xlsx` output, entirely in-browser with no server round-trip.

**Rationale**: SheetJS is the de-facto standard for spreadsheet I/O in JavaScript
environments. It handles legacy `.xls` (BIFF8 format) natively and generates `.xlsx`
(OOXML) without native browser support for either format.

**Key API patterns**:

```typescript
// Reading an uploaded .xls file
const buffer = await file.arrayBuffer();
const workbook = XLSX.read(buffer, { type: 'array' });

// Checking sheet existence
const hasSheet = workbook.SheetNames.includes('Спецификация');

// Parsing sheet to typed row objects (uses first row as header keys)
const sheet = workbook.Sheets['Спецификация'];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

// Validating column presence — check that all required keys appear
// in at least the first parsed row (or the raw header row):
const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
const requiredColumns = ['Код ЕАН', 'Модель', 'Артикул', 'Наименование',
                         'Размер', 'Размер (евро)', 'Параметры', 'Кол-во', 'Цена'];
const missingColumns = requiredColumns.filter(col => !headerRow.includes(col));

// Generating a .xlsx output workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Код', 'Название', 'საცალო Розничный', ...],  // header row
  ...dataRows,                                      // data rows as arrays
]);
XLSX.utils.book_append_sheet(wb, ws, 'Лист1');
const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
```

**Import strategy**: SheetJS must be imported as a side-effect-safe ESM import:
```typescript
import * as XLSX from 'xlsx';
```
Angular's build (esbuild) handles this correctly. No special polyfills required for
modern browser targets.

**Alternatives considered**:
- `ExcelJS` — more feature-rich but heavier bundle size (~500 KB vs ~200 KB for xlsx);
  does not read legacy `.xls` BIFF8 format without a plugin. Rejected.
- Native `File` API + manual BIFF8 parsing — prohibitively complex. Rejected.

---

## 2. JSZip for In-Browser ZIP Creation

**Decision**: Use JSZip (`jszip` npm package) to bundle the three `.xlsx` files into a
single ZIP archive and download it as a Blob URL.

**Rationale**: JSZip is well-maintained, has a simple async API, and produces RFC 1950
compliant ZIP files compatible with all operating systems.

**Key API pattern**:

```typescript
import JSZip from 'jszip';

const zip = new JSZip();
zip.file('basic-catalog.xlsx', basicBytes);
zip.file('extended-catalog.xlsx', extendedBytes);
zip.file('batumi-receipt.xlsx', batumiBytes);

const blob = await zip.generateAsync({ type: 'blob' });

// Trigger browser download
const url = URL.createObjectURL(blob);
const anchor = document.createElement('a');
anchor.href = url;
anchor.download = `invoice-export-${Date.now()}.zip`;
anchor.click();
URL.revokeObjectURL(url);  // release memory immediately
```

**Alternatives considered**:
- Native browser `CompressionStream` — only produces gzip/deflate streams, not ZIP
  archives. Cannot bundle multiple files. Rejected.
- `fflate` — lighter bundle (~70 KB vs ~100 KB for jszip) with synchronous API option.
  Valid alternative; JSZip chosen for wider familiarity and Promise-based API that
  integrates cleanly with Angular's async patterns.

---

## 3. Angular 21 File Upload — Drag-and-Drop + Accessibility

**Decision**: Implement the upload zone as a `<label>` element wrapping a hidden
`<input type="file" accept=".xls">`, augmented with HTML5 drag-and-drop event handlers.

**Rationale**: A `<label>` for the file input provides native keyboard activation
(Enter/Space on the label focuses the input) and automatic accessible name association.
This avoids needing `tabindex` and custom keydown handlers on the drop zone itself,
reducing the accessibility implementation surface.

**Pattern**:

```html
<label
  for="invoice-upload"
  class="..."
  [class.ring-2]="isDragOver()"
  (dragover)="onDragOver($event)"
  (dragleave)="onDragLeave()"
  (drop)="onDrop($event)"
>
  <!-- visual content: icon, instructional text -->
  <input
    id="invoice-upload"
    type="file"
    accept=".xls"
    class="sr-only"
    (change)="onFileSelected($event)"
  />
</label>
```

**WCAG 2.1 AA compliance points**:
- The `<label>` has visible text describing the action ("Upload invoice .xls file")
- `accept=".xls"` provides a hint to the OS file picker; validation still runs in code
  because the accept attribute is advisory only
- Drop zone has a visible focus ring (Tailwind `focus-within:ring-2`)
- `dragover` handler calls `event.preventDefault()` to allow drop
- File type is validated in TypeScript before any parsing

---

## 4. Angular Signals + Async Processing Pattern

**Decision**: `ConversionStateService` owns all reactive state as signals. The
`InvoiceProcessorService` is a pure async utility (returns `Promise`) with no internal
state. Components inject both services and trigger processing via an `async` method.

**Rationale**: Processing is a one-shot async operation, not a stream — `Promise` is the
correct primitive. Signals track the observable outcome (status, error, summary).
Using `effect()` or `toSignal()` to wrap the Promise would add unnecessary complexity.

**Pattern**:

```typescript
// In UploadAreaComponent
protected async handleFile(file: File): Promise<void> {
  this.state.startProcessing();
  try {
    const summary = await this.processor.processFile(file);
    this.state.setSuccess(summary);
  } catch (err) {
    this.state.setError(err instanceof AppError ? err.message : 'Unexpected error.');
  }
}
```

**OnPush + signals**: Angular 21 automatically schedules change detection when a signal
read inside a template changes value. `OnPush` + signals together ensure re-renders are
triggered only on actual state changes — no `markForCheck()` calls needed.

---

## 5. Tailwind CSS v4 — Configuration Approach

**Decision**: Use the CSS-based `@theme {}` directive in `src/styles.css` for all design
tokens. No `tailwind.config.ts` file is created — this is the Tailwind v4 idiomatic
approach.

**Rationale**: This project already has Tailwind CSS v4 installed (`@import 'tailwindcss'`
in `styles.css`). Tailwind v4 replaced JS/TS config with CSS-based configuration.
Creating a `tailwind.config.ts` is possible for backward compatibility but unnecessary
and goes against v4 conventions.

**Token definition pattern** (in `src/styles.css`):
```css
@import 'tailwindcss';

@theme {
  --color-brand-primary: oklch(55% 0.2 250);
  --color-brand-surface: oklch(97% 0.01 250);
  --color-status-error: oklch(50% 0.22 20);
  --color-status-success: oklch(50% 0.18 145);
  --color-status-warning: oklch(65% 0.18 85);
}
```
These become available as `bg-brand-primary`, `text-status-error`, etc.

---

## 6. Retail Price Calculation

**Decision**: `retailPrice = Math.round(purchasePrice * 7.85)` using the midpoint
coefficient. SheetJS parses numeric cells as JavaScript `number` values automatically.

**Rationale**: The spec defines a fixed coefficient of 7.85 (midpoint of the 7.2–8.5
range). The `Опт. надб., %` column is parsed and available on `InvoiceRow` but is not
used in output calculations in this version.

**Edge cases**:
- `purchasePrice` is `0` → `retailPrice` is `0` (valid)
- `purchasePrice` is `undefined`/`NaN` → guard: treat as `0`, include row without error
- SheetJS returns numeric values for numeric cells; string cells are coerced with `Number()`

---

## 7. Sort Implementation

**Decision**: Client-side sort using `Array.prototype.sort()` with `localeCompare` and
the `numeric: true` collation option.

**Sort rules**:
- **basic-catalog and extended-catalog**: primary sort by Артикул (from Модель column),
  secondary sort by Размер — both using numeric-aware collation.
- **batumi-receipt**: sort by კოდი (EAN code) using numeric-aware collation.

```typescript
// Catalog sort
rows.sort((a, b) => {
  const byArticle = String(a.model).localeCompare(String(b.model), undefined, { numeric: true });
  if (byArticle !== 0) return byArticle;
  return String(a.size).localeCompare(String(b.size), undefined, { numeric: true });
});

// Batumi sort
rows.sort((a, b) =>
  String(a.eanCode).localeCompare(String(b.eanCode), undefined, { numeric: true })
);
```

**Rationale**: `numeric: true` sorts "9" before "10" (vs lexicographic "10" < "9").
Article codes (from Модель) and sizes are likely numeric strings; numeric collation
handles both numeric and non-numeric values ("OS", "ONE SIZE") consistently.

---

## 8. Title Case Conversion

**Decision**: `value.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())`

**Rationale**: Product names are short clothing descriptions in Cyrillic and/or Latin
characters. JavaScript's `\b` word boundary correctly handles both script systems via
Unicode property matching in modern V8. The result is idempotent — applying Title Case
to already Title Case text produces identical output.

**Note**: `\b` in JS regex does not perfectly handle all Cyrillic word boundaries in
all edge cases, but for the data domain (short product names like "КРАСНЫЕ КРОССОВКИ
ХЛОПОК") it produces correct results. A more robust approach using `Intl.Segmenter` is
deferred unless Cyrillic edge cases are reported.

---

## 9. Testing Strategy

**Decision**: Use Vitest via `@angular/build:unit-test` (already configured) for all
unit and component tests. Add `axe-core` for accessibility assertions in component tests.

**Service testing**: `InvoiceProcessorService` is a pure TypeScript class with no Angular
dependencies — tests can import it directly without `TestBed`, making them fast and
isolated.

**Component testing**: Use Angular's `TestBed` + `@testing-library/angular` for
component tests. Each component test includes an axe-core scan:
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
// or equivalent vitest-axe
expect(await axe(fixture.nativeElement)).toHaveNoViolations();
```

**Packages to add for testing**:
- `@testing-library/angular` — idiomatic Angular component testing
- `vitest-axe` or `axe-core` directly with `axe()` helper

---

## Summary of Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| `xlsx` | latest | SheetJS: read `.xls`, write `.xlsx` |
| `jszip` | latest | In-browser ZIP creation |
| `@types/jszip` | latest (if needed) | TypeScript types for JSZip |
| `@testing-library/angular` | latest | Component testing utilities |
| `axe-core` | latest | Accessibility assertions in tests |
