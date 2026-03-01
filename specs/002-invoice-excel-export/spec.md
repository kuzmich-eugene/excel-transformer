# Feature Specification: Wholesale Invoice to Excel Export Converter

**Feature Branch**: `002-invoice-excel-export`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Build a web application for converting wholesale invoice
files into three different Excel export formats."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Successful Invoice Conversion (Priority: P1)

A user opens the application and uploads a valid wholesale invoice `.xls` file — either
by dragging it onto the upload area or clicking to browse their filesystem. The system
reads the "Спецификация" sheet, skips rows without an EAN code, calculates the retail
price in GEL for each row, and automatically downloads a ZIP archive containing three
correctly formatted Excel files. A loading indicator is shown during processing; a
success confirmation is shown once the download starts.

**Why this priority**: This is the entire purpose of the application. All other stories
have no value without a working end-to-end conversion.

**Independent Test**: Upload a known-valid invoice file with at least five data rows
(all with non-empty EAN codes). Verify that the downloaded ZIP contains exactly three
Excel files with the correct names, the correct sheet names, the correct column layouts,
the correct sort orders, and calculated retail prices equal to the purchase price
multiplied by the markup coefficient (rounded to the nearest whole number).

**Acceptance Scenarios**:

1. **Given** a valid `.xls` invoice file containing a sheet named "Спецификация" with
   the expected columns and at least one row with a non-empty Код ЕАН, **When** the user
   uploads it, **Then** the system shows a loading state, then auto-downloads a ZIP
   archive containing basic-catalog.xlsx, extended-catalog.xlsx, and batumi-receipt.xlsx.

2. **Given** the downloaded ZIP is opened and basic-catalog.xlsx is inspected, **When**
   the sheet "Лист1" is viewed, **Then** it contains exactly the columns: Код (EAN code),
   Название (product name in Title Case), საცალო Розничный (calculated retail price in
   GEL as a whole number), Размер, Размер (евр), Цвет, Артикул; rows are sorted by
   Артикул ascending then Размер ascending.

3. **Given** extended-catalog.xlsx is inspected, **When** the sheet "Лист1" is viewed,
   **Then** it contains all columns from basic-catalog.xlsx plus: არТиკული2 (string
   article from the source Артикул column), Штрихкод (identical to Код EAN), Описание
   (product name in Title Case); same sort order as basic-catalog.xlsx.

4. **Given** batumi-receipt.xlsx is inspected, **When** the sheet "ნიმუში" is viewed,
   **Then** it contains exactly the columns: კოდი (EAN code), რაოდენობა (quantity),
   თვითღირებულება (purchase price); rows sorted by კოდი ascending.

5. **Given** a source row where Наименование is in ALL CAPS (e.g., "RED COTTON
   SNEAKERS"), **When** it appears in basic-catalog.xlsx or extended-catalog.xlsx,
   **Then** the Название/Описание value is in Title Case (e.g., "Red Cotton Sneakers").

6. **Given** a source row with a valid purchase price (Цена), **When** the retail price
   is calculated, **Then** the result equals Цена × 7.85 rounded to the nearest whole
   number (e.g., 12.50 × 7.85 = 98.125 → 98).

---

### User Story 2 — Input Validation and Error States (Priority: P2)

A user attempts to upload a file that fails validation: wrong file type, a `.xls` file
missing the "Спецификация" sheet, or a file whose "Спецификация" sheet does not contain
the expected columns. The system displays a specific, actionable error message within
seconds and allows the user to try again without reloading the page.

**Why this priority**: Clear validation prevents silent bad output and guides users to
correct the problem quickly. Without it the application is unreliable.

**Independent Test**: Upload three deliberately invalid files in sequence — one `.pdf`,
one `.xls` without a "Спецификация" sheet, and one `.xls` with the sheet but wrong
columns — and verify each produces a distinct human-readable error with no crash and no
download attempt.

**Acceptance Scenarios**:

1. **Given** a user uploads a file that is not `.xls` (e.g., `.csv`, `.pdf`, `.xlsx`),
   **When** the upload is attempted, **Then** the system displays the message:
   "Unsupported file type. Please upload a .xls file." and no processing occurs.

2. **Given** a `.xls` file that does not contain a sheet named "Спецификация", **When**
   the file is uploaded, **Then** the system displays the message: "The file is missing
   the required 'Спецификация' sheet." and no processing occurs.

3. **Given** a `.xls` file that has a "Спецификация" sheet but is missing one or more
   expected columns (Код ЕАН, Модель, Артикул, Наименование, Размер, Размер (евро),
   Параметры, Кол-во, Цена), **When** the file is uploaded, **Then** the system displays
   an error naming the missing columns and no processing occurs.

4. **Given** any error message is displayed, **When** the user drops or selects a new
   file, **Then** the error is cleared and the new file is processed from scratch.

5. **Given** processing fails for an unexpected reason, **When** the error occurs,
   **Then** the system displays a general error message and remains usable — it does not
   crash or freeze.

---

### User Story 3 — Row Filtering and Empty Results (Priority: P3)

A user uploads a valid invoice file where some rows have an empty Код ЕАН. Those rows
are silently skipped. If all rows are skipped, the output files are still generated with
headers only and the user is informed that no data rows were exported.

**Why this priority**: Protecting output quality by excluding incomplete rows is a data
integrity requirement. It is lower priority than the happy path but must not be deferred.

**Independent Test**: Upload an invoice with a mix of rows — some with valid EAN codes
and some with empty ones. Verify the output files contain only the rows with non-empty
EAN codes, in the correct count.

**Acceptance Scenarios**:

1. **Given** an invoice where some rows have an empty Код ЕАН, **When** processing
   completes, **Then** those rows are absent from all three output files and rows with
   non-empty EAN codes are present.

2. **Given** an invoice where every row has an empty Код ЕАН, **When** processing
   completes, **Then** all three output files are generated with their column headers
   but zero data rows, and the UI displays a notice that no rows were exported.

3. **Given** the ZIP archive is produced from a file with some empty-EAN rows, **When**
   the file count inside the ZIP is inspected, **Then** all three files are always
   present regardless of how many rows were skipped.

---

### Edge Cases

- Invoice file has only one valid data row → output files contain exactly one data row
  each; no minimum row count requirement.
- Наименование contains mixed-case text (not all-caps) → Title Case is applied
  consistently and idempotently regardless of input casing.
- Two rows share the same Код ЕАН (same product, different sizes) → both rows are
  preserved in the output; no deduplication is performed.
- Цена (purchase price) is zero or missing → retail price calculation yields 0 or is
  empty; no error is raised; the row is included if EAN is present.
- Very large invoice files (hundreds of rows) → loading indicator is shown throughout;
  output is still correct.
- Размер contains non-numeric values (e.g., "OS", "ONE SIZE") → value is preserved as-is
  in the output; sorting by Размер treats non-numeric sizes consistently (e.g., after
  numeric sizes).

## Requirements *(mandatory)*

### Functional Requirements

**Upload Interface**

- **FR-001**: The application MUST provide a single-page interface with a drag-and-drop
  upload area and a click-to-browse fallback for selecting the invoice file.
- **FR-002**: Only one file is uploaded per conversion session; multi-file upload is not
  supported.

**Input Validation**

- **FR-003**: The system MUST reject files that are not `.xls` format and display:
  "Unsupported file type. Please upload a .xls file."
- **FR-004**: The system MUST reject `.xls` files that do not contain a sheet named
  "Спецификация" and display: "The file is missing the required 'Спецификация' sheet."
- **FR-005**: The system MUST verify that the "Спецификация" sheet contains the following
  columns: Код ЕАН, Модель, Артикул, Наименование, Размер, Размер (евро), Параметры,
  Кол-во, Цена. If any required column is absent, the system MUST display an error naming
  the missing columns.
- **FR-006**: The system MUST display a loading indicator from the moment processing
  begins until it either completes successfully or fails.

**Data Processing**

- **FR-007**: The system MUST skip any row in "Спецификация" where the Код ЕАН value
  is empty or blank.
- **FR-008**: The system MUST calculate the retail price in GEL for each row as:
  Цена × 7.85, rounded to the nearest whole number.
- **FR-009**: The system MUST convert Наименование values to Title Case (first letter of
  each word capitalised, all remaining letters lowercased) when populating name and
  description columns in the output.
- **FR-010**: The numeric article (Артикул output column in the Basic Catalog) MUST be
  sourced from the source column Модель.
- **FR-011**: The string article (არТиკული2 output column in the Extended Catalog) MUST
  be sourced from the source column Артикул.
- **FR-012**: The Цвет column in the output MUST be sourced verbatim from the source
  column Параметры.

**Output Generation**

- **FR-013**: The system MUST generate **basic-catalog.xlsx** with a sheet named "Лист1"
  containing the following columns in order: Код (= Код ЕАН), Название (= Наименование
  in Title Case), საცალო Розничный (= calculated retail price in GEL), Размер (= Размер),
  Размер (евр) (= Размер (евро)), Цвет (= Параметры), Артикул (= Модель). Rows MUST be
  sorted by Артикул ascending, then Размер ascending.

- **FR-014**: The system MUST generate **extended-catalog.xlsx** with a sheet named
  "Лист1" containing all columns from FR-013 plus in order: არТиკული2 (= Артикул source
  column), Штрихкод (= Код ЕАН), Описание (= Наименование in Title Case). Same sort
  order as FR-013.

- **FR-015**: The system MUST generate **batumi-receipt.xlsx** with a sheet named
  "ნიმუში" containing the following columns in order: კოდი (= Код ЕАН), რაოდენობა
  (= Кол-во), თვითღირებულება (= Цена). Rows MUST be sorted by კოდი ascending.

- **FR-016**: The system MUST package all three generated files into a single ZIP archive
  and automatically trigger its download to the user's device upon successful processing.

- **FR-017**: The system MUST display a clear success message once the ZIP download has
  been triggered.

- **FR-018**: If all rows were skipped due to empty EAN codes, the system MUST still
  generate and download the ZIP (with header-only sheets) and display a notice that no
  data rows were exported.

- **FR-019**: The system MUST display a clear error message for any processing failure
  and MUST NOT crash or become unresponsive.

### Key Entities

- **Invoice File**: The uploaded `.xls` file. Contains a sheet named "Спецификация"
  with one row per line item and the following source columns:

  | Source Column   | Description                                     |
  |-----------------|--------------------------------------------------|
  | Код ЕАН         | EAN barcode; rows with empty value are skipped   |
  | Модель          | Numeric article code                             |
  | Артикул         | String article code                              |
  | Наименование    | Product name (typically in ALL CAPS)             |
  | Размер          | Size                                             |
  | Размер (евро)   | Euro size                                        |
  | Параметры       | Color / product parameters                       |
  | Кол-во          | Quantity                                         |
  | Цена            | Purchase price                                   |
  | Опт. надб., %   | Wholesale markup percentage (read but not mapped to any output column in this version) |

- **Basic Catalog Export** (basic-catalog.xlsx): A catalog listing file. Sheet "Лист1".
  Output columns: Код, Название, საცალო Розничный, Размер, Размер (евр), Цвет, Артикул.
  Sorted: Артикул ↑, Размер ↑.

- **Extended Catalog Export** (extended-catalog.xlsx): An enriched catalog listing.
  Sheet "Лист1". All columns from the Basic Catalog plus: არТиკული2, Штрихкод, Описание.
  Same sort order.

- **Batumi Receipt Export** (batumi-receipt.xlsx): A purchasing/receiving document.
  Sheet "ნიმუში". Output columns: კოდი, რაოდენობა, თვითღირებულება. Sorted: კოდი ↑.

- **Export Archive**: ZIP file delivered to the user on success containing all three
  export files. Not stored server-side after the download is triggered.

## Assumptions

- The fixed retail price markup coefficient is **7.85** (midpoint of the 7.2–8.5 range).
  The "Опт. надб., %" column from the invoice is available in the data but is not used
  to vary the coefficient per row in this version.
- Title Case conversion follows standard rules: first letter of each word capitalised,
  all remaining letters lowercased. No language-specific capitalisation exceptions are
  required.
- "Rows sorted by Размер ascending" applies lexicographic sort when Размер contains
  non-numeric values (e.g., "OS"); numeric sizes appear before non-numeric ones due to
  standard string collation.
- The ZIP archive is named automatically (e.g., using the source filename or a timestamp);
  the exact convention is a technical detail resolved during planning.
- The application is used by a single user at a time; no authentication, user accounts,
  or concurrent session isolation is required.
- `.xls` refers specifically to the legacy Excel 97-2003 binary format, not `.xlsx`. The
  application need not accept `.xlsx` uploads.
- No data is persisted server-side between sessions; each conversion is stateless.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a valid invoice file and receive a complete, correct ZIP
  archive within 30 seconds for files containing up to 500 data rows.
- **SC-002**: Calculated retail prices in both catalog exports match Цена × 7.85 rounded
  to the nearest whole number with 100% accuracy across all rows.
- **SC-003**: 100% of rows with an empty Код ЕАН are excluded from all three output
  files, with zero false exclusions of rows that have a valid EAN.
- **SC-004**: All three output files use the exact specified sheet names ("Лист1",
  "Лист1", "ნიმუში") and exact specified file names (basic-catalog.xlsx,
  extended-catalog.xlsx, batumi-receipt.xlsx) in every successful conversion.
- **SC-005**: Users see a distinct, specific error message within 3 seconds for each of
  the three invalid-input conditions (unsupported file type, missing sheet, missing
  columns) — no generic "something went wrong" message is shown for known error types.
- **SC-006**: The ZIP archive download starts automatically on success without requiring
  any additional user action beyond the initial upload.
- **SC-007**: The application remains functional and responsive after an error — users can
  upload a new file immediately without reloading the page.
