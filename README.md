# Invoice Excel Converter

A pure-browser Angular 21 single-page application that converts wholesale `.xls` invoice
files into three formatted Excel exports, packaged as a ZIP archive — no server required.

## What It Does

Upload a wholesale invoice `.xls` file containing a **"Спецификация"** sheet. The app:

1. Validates the file format and required columns
2. Calculates retail prices (`Цена × 7.85`, rounded to nearest whole number)
3. Converts product names to Title Case
4. Generates and auto-downloads a ZIP archive containing:

| File | Sheet | Contents |
|------|-------|---------|
| `basic-catalog.xlsx` | Лист1 | EAN, name, retail price, size, euro size, color, article |
| `extended-catalog.xlsx` | Лист1 | All above + string article, barcode, description |
| `batumi-receipt.xlsx` | ნიმუში | EAN, quantity, purchase price |

## Prerequisites

- Node.js 20 or 22 LTS
- npm 10+

## Setup

```bash
git clone <repo-url> excel-transformer
cd excel-transformer
npm install
```

## Running Locally

```bash
npm start
```

Open `http://localhost:4200`.

## Running Tests

```bash
npm test
```

Runs all unit tests (services + accessibility) via Vitest.

## Building for Production

```bash
npm run build
```

Output written to `dist/excel-transformer/browser/`. No server needed — deploy as static files.

## Technical Details

- **Framework**: Angular 21 (standalone components, signals, OnPush)
- **Styling**: Tailwind CSS v4
- **File I/O**: [SheetJS](https://sheetjs.com/) for `.xls` reading and `.xlsx` generation
- **ZIP**: [JSZip](https://stuk.github.io/jszip/) for in-browser archive creation
- **Testing**: Vitest + jest-axe (accessibility)

## Input File Requirements

The uploaded `.xls` file must contain a sheet named **"Спецификация"** with these columns:

`Код ЕАН` · `Модель` · `Артикул` · `Наименование` · `Размер` · `Размер (евро)` · `Параметры` · `Кол-во` · `Цена`

Rows with empty `Код ЕАН` are silently skipped.

## Developer Guide

See [`specs/002-invoice-excel-export/quickstart.md`](specs/002-invoice-excel-export/quickstart.md)
for the full manual testing checklist and troubleshooting notes.
