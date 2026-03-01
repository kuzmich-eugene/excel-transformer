# Implementation Plan: Wholesale Invoice to Excel Export Converter

**Branch**: `002-invoice-excel-export` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-invoice-excel-export/spec.md`

## Summary

Build a pure-browser Angular 21 SPA that accepts a `.xls` wholesale invoice file via
drag-and-drop or click-to-browse, validates its structure, parses the "Спецификация"
sheet, computes retail prices (Цена × 7.85 rounded), and automatically downloads a ZIP
archive containing three formatted `.xlsx` files. All file I/O runs in-browser using
SheetJS for spreadsheet parsing/generation and JSZip for archive creation. No backend or
server-side processing is involved.

## Technical Context

**Language/Version**: TypeScript ~5.9 (Angular 21 constraint)
**Primary Dependencies**:
- Angular 21.2 (standalone components, signals API, OnPush)
- Tailwind CSS 4.1 (`@import 'tailwindcss'` / CSS-based `@theme` config)
- SheetJS `xlsx` — browser `.xls` reading + `.xlsx` generation
- JSZip — in-browser ZIP creation and Blob download
**Storage**: N/A — stateless, no persistence between sessions
**Testing**: Vitest via `@angular/build:unit-test`, axe-core (accessibility assertions)
**Target Platform**: Modern desktop browser (Chrome 120+, Firefox 120+, Safari 17+, Edge 120+)
**Project Type**: Single-page web application (SPA), pure frontend
**Performance Goals**: Process and deliver ZIP for ≤ 500 invoice rows within 30 seconds
**Constraints**: All processing in-browser (no network requests after initial load); offline-capable
**Scale/Scope**: Single user, single page, one upload per session, three output files per run

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — all gates hold.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Angular 21 + Standalone Components | ✅ PASS | All components `standalone: true`; no NgModules introduced; lazy loading via `loadComponent` if routes are added |
| II. Signals-First State Management | ✅ PASS | `ConversionStateService` owns all mutable state as signals; `InvoiceProcessorService` is a stateless async utility; components consume signals via `inject()` |
| III. OnPush Change Detection | ✅ PASS | Every component declares `ChangeDetectionStrategy.OnPush`; templates reference signals only — no method calls |
| IV. Tailwind CSS — Utility-First Styling | ✅ PASS | Tailwind CSS v4 is installed; design tokens defined via `@theme {}` in `styles.css` (v4 idiomatic; see note below) |
| V. Accessibility — WCAG 2.1 AA | ✅ PASS | Upload zone: `role="button"` + keyboard handler + `aria-label`; status: `aria-live` regions; axe-core in component tests |
| VI. Test-Driven Quality Gates | ✅ PASS | `InvoiceProcessorService` tests written before implementation; component tests include axe-core assertions |

> **Tailwind v4 note**: This project uses Tailwind CSS v4 which replaces `tailwind.config.ts`
> with CSS-based configuration (`@theme { }` in `styles.css`). The constitution's principle that
> `tailwind.config.ts` is the "single source of truth for design tokens" applies conceptually —
> in this project, `src/styles.css` serves that role via the `@theme` directive.

## Project Structure

### Documentation (this feature)

```text
specs/002-invoice-excel-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── service-interfaces.md   # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── app.ts                           # Root component (standalone, OnPush)
│   ├── app.html                         # Root template — renders UploadPageComponent
│   ├── app.css                          # Empty (all styling via Tailwind utilities)
│   ├── app.config.ts                    # Angular app config (no router; provideAnimationsAsync)
│   ├── components/
│   │   ├── upload-area/
│   │   │   ├── upload-area.ts           # Standalone, OnPush — drag-drop + browse zone
│   │   │   └── upload-area.html
│   │   └── status-message/
│   │       ├── status-message.ts        # Standalone, OnPush — loading/success/error/warnings
│   │       └── status-message.html
│   ├── services/
│   │   ├── invoice-processor.service.ts # Stateless async service: parse → export → zip → download
│   │   └── conversion-state.service.ts  # Signal-based state: status, error, summary
│   └── models/
│       ├── invoice-row.model.ts         # InvoiceRow interface
│       ├── conversion-state.model.ts    # ConversionStatus type + ProcessingSummary interface
│       └── processing-result.model.ts   # ExportFiles interface + ValidationError types
├── index.html
├── main.ts
└── styles.css                           # @import 'tailwindcss' + @theme tokens
```

**Structure Decision**: Single Angular project at repository root (existing Angular CLI structure).
No backend directory — all logic is browser-side. Router is removed in favour of a single
`AppComponent` that renders the converter page directly, eliminating unnecessary routing
indirection for a single-page utility.

## Complexity Tracking

> No constitution violations requiring justification.
