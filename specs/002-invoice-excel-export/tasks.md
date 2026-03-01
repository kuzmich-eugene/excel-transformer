# Tasks: Wholesale Invoice to Excel Export Converter

**Input**: Design documents from `/specs/002-invoice-excel-export/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included per Constitution Principle VI — unit tests for all signal-based
services and computed logic; axe-core accessibility assertions for all components.

**Organization**: Tasks grouped by user story for independent implementation and delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different files, no unresolved dependencies
- **[Story]**: User story scope (US1, US2, US3); omitted for Setup/Foundational/Polish phases
- Each task includes an exact file path

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Install new dependencies and clean the default Angular placeholder scaffold.

- [x] T001 Install runtime dependencies: `npm install xlsx jszip` (adds to `package.json`)
- [x] T002 Install dev testing dependencies: `npm install --save-dev @testing-library/angular axe-core` (adds to `package.json`)
- [x] T003 [P] Simplify app bootstrap: remove `provideRouter` from `src/app/app.config.ts`; clear `src/app/app.routes.ts`; remove `RouterOutlet` import from `src/app/app.ts`; delete Angular welcome placeholder from `src/app/app.html` and `src/app/app.css`
- [x] T004 [P] Define Tailwind v4 design tokens in `src/styles.css`: add `@theme {}` block with brand, surface, status-error, status-success, and status-warning color variables

---

## Phase 2: Foundational (Shared Models and State Infrastructure)

**Purpose**: Core data types and the signal-based state service that every component depends on. No user story can proceed until this phase is complete.

**⚠️ CRITICAL**: Component implementation (Phase 3+) depends on `ConversionStateService` being complete and tested.

- [x] T005 [P] Create `InvoiceRow` interface in `src/app/models/invoice-row.model.ts` — all fields from data-model.md: `eanCode`, `model`, `article`, `name`, `size`, `euroSize`, `parameters`, `quantity`, `purchasePrice`, `wholesaleMarkup`, `retailPrice`
- [x] T006 [P] Create `ExportFiles` and `ProcessingSummary` interfaces and all error classes (`AppError`, `UnsupportedFileTypeError`, `MissingSheetError`, `MissingColumnsError`, `ProcessingError`) in `src/app/models/processing-result.model.ts`
- [x] T007 [P] Create `ConversionStatus` type (`'idle' | 'loading' | 'success' | 'error'`) in `src/app/models/conversion-state.model.ts`
- [x] T008 [P] Write unit tests for `ConversionStateService` — verify all four state transitions (`startProcessing`, `setSuccess`, `setError`, `reset`) produce correct signal values in `src/app/services/conversion-state.service.spec.ts`
- [x] T009 Implement `ConversionStateService` with signals: `status`, `errorMessage`, `processingSummary`; implement `startProcessing()`, `setSuccess()`, `setError()`, `reset()` in `src/app/services/conversion-state.service.ts` (depends on T005–T008)

**Checkpoint**: Run `ng test` — `ConversionStateService` tests must pass before any component work begins.

---

## Phase 3: User Story 1 — Successful Invoice Conversion (Priority: P1) 🎯 MVP

**Goal**: User uploads a valid `.xls` invoice → loading state → ZIP auto-downloads containing three correctly formatted Excel files → success message displayed.

**Independent Test**: Upload a known-valid invoice file with ≥ 5 rows (all non-empty EAN). Verify: ZIP downloads automatically; three files present; `basic-catalog.xlsx` has sheet "Лист1" with 7 columns sorted by Артикул ↑ then Размер ↑; `extended-catalog.xlsx` has sheet "Лист1" with 10 columns same sort; `batumi-receipt.xlsx` has sheet "ნიმუში" with 3 columns sorted by კოდი ↑; all retail prices = `Math.round(Цена × 7.85)`; all product names in Title Case.

### Tests for User Story 1 ⚠️ Write FIRST — must FAIL before T011

- [x] T010 [P] [US1] Write unit tests for `InvoiceProcessorService` happy path — test: `toTitleCase()` converts ALL CAPS correctly; `calcRetailPrice()` applies 7.85 and rounds; `parseRows()` maps all 11 source columns; catalog sort orders (article ↑ then size ↑); batumi sort (EAN ↑); `buildBasicCatalog()` produces correct 7-column schema; `buildExtendedCatalog()` produces correct 10-column schema; `buildBatumiReceipt()` produces correct 3-column schema in `src/app/services/invoice-processor.service.spec.ts`

### Implementation for User Story 1

- [x] T011 [US1] Implement `InvoiceProcessorService` — complete: `processFile(file)` entry point; `validateFileType()` (extension + MIME check); `parseWorkbook()` (SheetJS `XLSX.read`); `parseRows()` (maps source columns to `InvoiceRow[]`); `calcRetailPrice()` (`Math.round(price * 7.85)`); `toTitleCase()` (`/\b\w/g` regex); `buildBasicCatalog()`, `buildExtendedCatalog()`, `buildBatumiReceipt()` (SheetJS AOA → xlsx bytes); `downloadZip()` (JSZip + Blob URL) in `src/app/services/invoice-processor.service.ts` (depends on T010)
- [x] T012 [P] [US1] Implement `UploadAreaComponent` (standalone, OnPush): `<label>` wrapping `<input type="file" accept=".xls" class="sr-only">` for keyboard accessibility; `dragover`, `dragleave`, `drop` handlers updating `isDragOver` signal; `async handleFile(file)` injecting both services; upload disabled during loading state; WCAG-compliant accessible name and `focus-within:ring-2` Tailwind focus ring in `src/app/components/upload-area/upload-area.ts` and `src/app/components/upload-area/upload-area.html`
- [x] T013 [P] [US1] Implement `StatusMessageComponent` (standalone, OnPush) for loading and success states: loading spinner with `aria-live="polite"` live region and "Processing your invoice…" text; success message showing exported row count in `src/app/components/status-message/status-message.ts` and `src/app/components/status-message/status-message.html`
- [x] T014 [US1] Assemble root page: import `UploadAreaComponent` and `StatusMessageComponent` into `AppComponent` (standalone, OnPush); apply full-page Tailwind layout (centered card, responsive) in `src/app/app.ts` and `src/app/app.html` (depends on T012, T013)
- [x] T015 [P] [US1] Write axe-core accessibility test for `UploadAreaComponent`: verify zero critical/serious violations in idle state; verify file input has an accessible name; verify focus ring is present in `src/app/components/upload-area/upload-area.spec.ts`

**Checkpoint**: At this point User Story 1 is fully functional. Upload a real invoice and confirm the ZIP downloads with all three correctly formatted files.

---

## Phase 4: User Story 2 — Input Validation and Error States (Priority: P2)

**Goal**: Three specific error messages for invalid inputs; upload zone immediately re-enables for a retry.

**Independent Test**: Upload a `.pdf` → error "Unsupported file type…"; upload a `.xls` without "Спецификация" → error about missing sheet; upload a `.xls` with wrong columns → error naming the missing columns; after each error, drop a new file and confirm processing restarts.

### Tests for User Story 2 ⚠️ Write FIRST — must FAIL before T017–T018

- [x] T016 [P] [US2] Extend `InvoiceProcessorService` unit tests — error paths: `processFile()` throws `UnsupportedFileTypeError` for non-`.xls`; throws `MissingSheetError` when "Спецификация" absent; throws `MissingColumnsError` with correct missing column list when required columns absent in `src/app/services/invoice-processor.service.spec.ts`

### Implementation for User Story 2

- [x] T017 [US2] Extend `StatusMessageComponent` to handle error state: render error message text in `role="alert"` element with `aria-live="assertive"`; add "Try uploading a different file" retry prompt in `src/app/components/status-message/status-message.ts` and `src/app/components/status-message/status-message.html`
- [x] T018 [US2] Extend `UploadAreaComponent`: call `state.reset()` before `state.startProcessing()` when a new file arrives while `status` is `'success'` or `'error'`; ensure upload zone remains interactive in `success`/`error` states in `src/app/components/upload-area/upload-area.ts`
- [x] T019 [P] [US2] Write axe-core accessibility tests for `StatusMessageComponent` in error state: verify `role="alert"` present; verify zero critical/serious violations; verify error message text is announced via live region in `src/app/components/status-message/status-message.spec.ts`

**Checkpoint**: User Stories 1 and 2 both work independently. All three error scenarios show correct messages and the upload zone resets cleanly.

---

## Phase 5: User Story 3 — Row Filtering and Empty Results (Priority: P3)

**Goal**: Rows with empty Код ЕАН silently excluded; all-empty invoice produces header-only sheets with a UI notice.

**Independent Test**: Upload a mixed-EAN invoice (some rows with empty EAN) → output files contain only rows with non-empty EAN, correct count; upload an all-empty-EAN invoice → ZIP downloads with header-only sheets, UI shows "no rows exported" notice.

### Tests for User Story 3 ⚠️ Write FIRST — must FAIL before T021

- [x] T020 [P] [US3] Extend `InvoiceProcessorService` unit tests — filtering: mixed-EAN invoice produces `ProcessingSummary` with correct `skippedRows` and `exportedRows` counts; all-empty-EAN invoice produces `exportedRows === 0` and `skippedRows === total`; output sheets contain only rows with non-empty EAN in `src/app/services/invoice-processor.service.spec.ts`

### Implementation for User Story 3

- [x] T021 [US3] Extend `StatusMessageComponent`: add skipped-row count detail to success message ("N rows exported, M skipped"); render a distinct "No rows were exported — all EAN codes were empty" notice when `exportedRows === 0` in `src/app/components/status-message/status-message.ts` and `src/app/components/status-message/status-message.html`

**Checkpoint**: All three user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UI refinement and documentation that benefits all stories.

- [x] T022 [P] Set page `<title>Invoice Excel Converter</title>` and add `<meta name="description" content="Convert wholesale .xls invoice files to Excel export formats">` in `src/index.html`
- [x] T023 [P] Add drag-active visual feedback to `UploadAreaComponent`: dashed border, background tint, and "Drop to upload" text change when `isDragOver` signal is true in `src/app/components/upload-area/upload-area.ts` and `src/app/components/upload-area/upload-area.html`
- [x] T024 Run full manual testing checklist from `specs/002-invoice-excel-export/quickstart.md`; fix any discovered issues across all three user stories
- [x] T025 [P] Update `README.md` with invoice converter overview, setup steps (`npm install xlsx jszip`), usage instructions, and link to `specs/002-invoice-excel-export/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on T001–T002 (dependencies installed)
- **Phase 3 (US1)**: Depends on Phase 2 completion — blocks all user story work
- **Phase 4 (US2)**: Depends on Phase 3 (US2 extends the service and status component built in US1)
- **Phase 5 (US3)**: Depends on Phase 3 (US3 extends the same service and status component)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Depends on US1 (`StatusMessageComponent` and `UploadAreaComponent` created in US1)
- **US3 (P3)**: Depends on US1 (`StatusMessageComponent` created in US1); US3 and US2 can run in parallel

### Within Each Phase

- Tests (`T010`, `T016`, `T020`) MUST be written and FAIL before their paired implementation task
- Models (`T005`, `T006`, `T007`) before service implementation (`T009`, `T011`)
- Service (`T009`, `T011`) before components (`T012`, `T013`)
- Components (`T012`, `T013`) before assembly (`T014`)

### Parallel Opportunities

- **Phase 1**: T001 → T002 sequential (npm lock); T003 and T004 parallel with T001/T002
- **Phase 2**: T005, T006, T007, T008 all fully parallel (different files)
- **Phase 3**: T010 (write tests) starts immediately; T012, T013 parallel after T009; T015 parallel after T012
- **Phase 4**: T016 (write tests) starts immediately after Phase 3; T017, T019 parallel after T016
- **Phase 5**: T020 (write tests) starts immediately; T021 after T020
- **Phase 6**: T022, T023, T025 all parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# All four tasks start simultaneously — each writes to a different file:
Task: "Create InvoiceRow interface in src/app/models/invoice-row.model.ts"           # T005
Task: "Create ExportFiles, ProcessingSummary, error classes in processing-result.model.ts" # T006
Task: "Create ConversionStatus type in src/app/models/conversion-state.model.ts"    # T007
Task: "Write ConversionStateService tests in conversion-state.service.spec.ts"       # T008
# Then T009 (implement ConversionStateService) once T005-T008 complete
```

## Parallel Example: User Story 1

```bash
# T010 writes tests — start immediately (different file from T011 impl):
Task: "Write InvoiceProcessorService happy-path tests in invoice-processor.service.spec.ts" # T010

# Once T009 completes:
Task: "Implement UploadAreaComponent in upload-area.ts + upload-area.html"   # T012
Task: "Implement StatusMessageComponent in status-message.ts + .html"        # T013

# T015 after T012; T014 after T012 + T013:
Task: "Write axe-core test for UploadAreaComponent in upload-area.spec.ts"   # T015
Task: "Assemble root page in app.ts + app.html"                              # T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T009)
3. Complete Phase 3: User Story 1 (T010–T015)
4. **STOP and VALIDATE**: Run `ng test`, verify all tests pass; upload a real invoice file and confirm ZIP downloads correctly
5. Demo / deploy MVP

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 complete → core conversion works end-to-end (MVP)
3. US2 complete → validation errors give clear feedback
4. US3 complete → empty-EAN filtering works with UI notice
5. Polish → drag feedback, page title, README
6. Each increment deployable independently

---

## Notes

- `[P]` = different files, no unresolved task dependencies — safe to parallelise
- `[US?]` maps task to a user story for delivery traceability
- Tests marked `⚠️ Write FIRST` are Constitution Principle VI requirements: they MUST fail before paired implementation tasks run
- Use `ng test --watch` during development for continuous feedback
- Verify axe-core tests with `ng test` before marking any component task complete
- Manual checklist in `specs/002-invoice-excel-export/quickstart.md` covers all acceptance scenarios
