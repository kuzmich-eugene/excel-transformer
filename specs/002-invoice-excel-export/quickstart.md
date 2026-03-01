# Developer Quickstart: Wholesale Invoice to Excel Export Converter

**Branch**: `002-invoice-excel-export` | **Date**: 2026-03-01

---

## Prerequisites

| Tool | Required Version | Check |
|------|-----------------|-------|
| Node.js | LTS (20 or 22) | `node --version` |
| npm | 10+ | `npm --version` |
| Angular CLI | 21.x | `ng version` |

---

## 1. Clone and Switch to Feature Branch

```bash
git clone <repo-url> excel-transformer
cd excel-transformer
git checkout 002-invoice-excel-export
```

---

## 2. Install Dependencies

```bash
npm install
```

Install the two new runtime dependencies for this feature:

```bash
npm install xlsx jszip
```

Install testing utilities:

```bash
npm install --save-dev @testing-library/angular axe-core
```

Verify all packages are present:

```bash
npm ls xlsx jszip @testing-library/angular axe-core
```

---

## 3. Run the Development Server

```bash
npm start
# or
ng serve
```

Open `http://localhost:4200` in your browser. The app should show the invoice upload
interface (once implemented), replacing the default Angular placeholder.

---

## 4. Run Unit Tests

```bash
npm test
# or
ng test
```

The Vitest runner starts and runs all `*.spec.ts` files. Tests for the processing
service (`invoice-processor.service.spec.ts`) MUST be written and failing before
implementation begins (TDD — see Constitution Principle VI).

To run in watch mode:

```bash
ng test --watch
```

---

## 5. Build for Production

```bash
ng build
```

Output is written to `dist/excel-transformer/browser/`. The build is fully static
(no server required) and can be served from any CDN or static host.

---

## 6. Manual Testing Checklist

Use this checklist to validate the feature end-to-end before marking tasks complete.

### Happy Path (User Story 1)

- [ ] Open the app at `http://localhost:4200`
- [ ] Drag a valid `.xls` invoice file with "Спецификация" sheet onto the drop zone
- [ ] Confirm loading indicator appears immediately
- [ ] Confirm a ZIP file downloads automatically when processing completes
- [ ] Open the ZIP — verify it contains: `basic-catalog.xlsx`, `extended-catalog.xlsx`, `batumi-receipt.xlsx`
- [ ] Open `basic-catalog.xlsx` — verify sheet name is "Лист1", 7 columns present, rows sorted by Артикул then Размер
- [ ] Open `extended-catalog.xlsx` — verify sheet name is "Лист1", 10 columns present, same sort
- [ ] Open `batumi-receipt.xlsx` — verify sheet name is "ნიმუში", 3 columns present, sorted by კოდი
- [ ] Verify retail prices = purchase price × 7.85 rounded to whole number (spot-check 3 rows)
- [ ] Verify product names are Title Case (not ALL CAPS)
- [ ] Confirm success message appears with row count

### Validation (User Story 2)

- [ ] Upload a `.csv` file — confirm error: "Unsupported file type. Please upload a .xls file."
- [ ] Upload a `.xls` file without "Спецификация" sheet — confirm error about missing sheet
- [ ] Upload a `.xls` file with wrong columns — confirm error naming the missing columns
- [ ] After each error, confirm the upload zone is still interactive (can drop a new file)

### Row Filtering (User Story 3)

- [ ] Upload a file with some empty-EAN rows — confirm those rows are absent from all 3 outputs
- [ ] Upload a file where ALL rows have empty EAN — confirm ZIP still downloads, sheets have headers only, UI shows a notice

### Accessibility

- [ ] Tab to the upload zone using keyboard only — confirm it receives focus and has a visible focus ring
- [ ] Press Enter/Space on the focused upload zone — confirm the OS file picker opens
- [ ] Use a screen reader (VoiceOver / NVDA) — confirm the zone is announced with a useful label
- [ ] Trigger the loading state — confirm it is announced by the screen reader via live region
- [ ] Trigger an error — confirm the error message is announced immediately

---

## 7. Key File Locations (once implemented)

| File | Purpose |
|------|---------|
| `src/app/components/upload-area/upload-area.ts` | Drag-and-drop upload zone component |
| `src/app/components/status-message/status-message.ts` | Loading/success/error display |
| `src/app/services/invoice-processor.service.ts` | Core parsing + export logic |
| `src/app/services/conversion-state.service.ts` | Signal-based state |
| `src/app/models/invoice-row.model.ts` | InvoiceRow interface |
| `src/app/models/conversion-state.model.ts` | ConversionStatus type, ProcessingSummary |
| `src/app/models/processing-result.model.ts` | ExportFiles interface, error classes |
| `src/styles.css` | Tailwind v4 import + `@theme` design tokens |

---

## 8. Troubleshooting

**SheetJS fails to read `.xls`**: Ensure the file is a genuine legacy `.xls` (BIFF8),
not a renamed `.xlsx`. SheetJS distinguishes them by magic bytes, not file extension.

**JSZip download does not trigger**: Check that `document.createElement('a')` and
`URL.createObjectURL` are called inside the Angular zone. If using `async/await` in a
service, this should work without zone patching.

**Tailwind classes not applied**: Confirm `src/styles.css` has `@import 'tailwindcss';`
as the first line and that the Angular CLI build includes `styles.css` in `angular.json`
styles array.

**axe-core test failures**: Investigate specific violations in the test output. Common
causes: missing `aria-label` on the file input, colour contrast issues with custom
`@theme` tokens, or missing `aria-live` on the status region.
