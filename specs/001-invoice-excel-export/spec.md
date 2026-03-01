# Feature Specification: Wholesale Invoice to Excel Export Converter

**Feature Branch**: `001-invoice-excel-export`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Build a web application for converting wholesale invoice files into three
different Excel export formats."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Successful Invoice Conversion (Priority: P1)

A user opens the application, uploads a valid wholesale invoice file (format 77078) by
dragging it onto the upload area or clicking to browse their filesystem. The system
processes the file against the product catalog and automatically downloads a ZIP archive
containing all three correctly formatted Excel files. The user sees a loading indicator
during processing and a success confirmation once the download starts.

**Why this priority**: This is the entire purpose of the application. Without a working
end-to-end conversion, no other scenario has value.

**Independent Test**: Upload a known-valid invoice file and verify that the downloaded
ZIP contains exactly three Excel files with the correct sheet names, correct column sets,
correct sort orders, and correct catalog-sourced prices.

**Acceptance Scenarios**:

1. **Given** a valid .xls invoice file with a "Спецификация" sheet and at least one row
   with a non-empty EAN code, **When** the user uploads it, **Then** the system displays
   a loading state, then auto-downloads a ZIP archive containing лаи_формат_1.xlsx,
   лаи_формат_2.xlsx, and батуми_формат.xlsx.
2. **Given** the downloaded ZIP is opened, **When** лаи_формат_1.xlsx is inspected,
   **Then** sheet "Лист1" contains columns: EAN code, bilingual product name, retail price
   in GEL, size, euro size, color, numeric article; rows are sorted by article then by size.
3. **Given** the downloaded ZIP is opened, **When** лаи_формат_2.xlsx is inspected,
   **Then** sheet "Лист1" contains all columns from лаи_формат_1.xlsx plus: string article
   code, barcode (identical to EAN), and product description in Title Case; sorted by
   article then size.
4. **Given** the downloaded ZIP is opened, **When** батуми_формат.xlsx is inspected,
   **Then** sheet "ნიმუში" contains columns: EAN code, quantity, purchase price; rows
   sorted by EAN code in ascending order.
5. **Given** a product description in the invoice is in ALL CAPS (e.g., "RED COTTON
   SNEAKERS"), **When** the Extended Catalog export is generated, **Then** the description
   appears in Title Case (e.g., "Red Cotton Sneakers").

---

### User Story 2 — Partial Catalog Hits and Warnings (Priority: P2)

A user uploads a valid invoice file where some product article codes exist in the catalog
and some do not. The system still produces all three export files — rows for missing
products have empty name and price fields instead of calculated or estimated values. The
user sees a visible warning listing each product model that was not found.

**Why this priority**: Real-world invoices routinely contain new or unlisted products.
The export must never fail or silently omit rows because of missing catalog entries;
partial results with transparent warnings are more valuable than a blocked export.

**Independent Test**: Upload an invoice where exactly one article code is absent from the
catalog. Verify the output files contain that row with empty name/price, and a named
warning is shown in the UI for that article.

**Acceptance Scenarios**:

1. **Given** an invoice row whose article code does not exist in the catalog, **When**
   the file is processed, **Then** that row appears in the output with the product name
   field empty and the retail price field empty — no value is estimated or calculated.
2. **Given** one or more article codes are missing from the catalog, **When** processing
   completes, **Then** the UI displays a warning for each missing article code, identifying
   it by its numeric article number.
3. **Given** warnings are displayed, **When** the user reviews them, **Then** the export
   download still proceeds and the ZIP is available — warnings do not block the export.
4. **Given** a row has a non-empty EAN code but its article code is not in the catalog,
   **When** the Batumi Receipt export is generated, **Then** that row still appears with
   its EAN, quantity, and purchase price — the Batumi file is not affected by catalog
   lookup gaps.

---

### User Story 3 — File Validation and Error States (Priority: P3)

A user attempts to upload a file that is invalid: wrong file type, not in format 77078,
or missing the required "Спецификация" sheet. The system rejects the file immediately
with a specific, actionable error message and allows the user to try again without
reloading the page.

**Why this priority**: Clear error feedback prevents user confusion and data loss from
processing garbage input. The application is unusable without reliable validation.

**Independent Test**: Upload three deliberately invalid files — one non-.xls file, one
.xls file missing the "Спецификация" sheet, and one .xls file with an unexpected column
layout — and verify that each produces a distinct, human-readable error message.

**Acceptance Scenarios**:

1. **Given** a user drags a .csv or .pdf or other non-.xls file onto the upload area,
   **When** the upload is attempted, **Then** the system shows the error: "Unsupported
   file type. Please upload a .xls file."
2. **Given** a valid .xls file that does not contain a sheet named "Спецификация",
   **When** the file is uploaded, **Then** the system shows the error: "The uploaded
   file is missing the required 'Спецификация' sheet."
3. **Given** a .xls file with the "Спецификация" sheet but columns not matching format
   77078, **When** the file is uploaded, **Then** the system shows an error identifying
   the format mismatch and prompts the user to check the file.
4. **Given** any error state is displayed, **When** the user uploads a different file,
   **Then** the error is cleared and processing proceeds fresh.

---

### Edge Cases

- All rows in the invoice have empty EAN codes → all three output files are generated
  with headers only (zero data rows); user is warned that no rows were exported.
- Every article code in the invoice is absent from the catalog → all three files are
  generated; лаи_формат_1 and лаи_формат_2 have empty name/price columns throughout;
  warnings are shown for every missing article; батуми_формат is unaffected.
- Product description is already in Title Case or mixed case → Title Case conversion is
  applied consistently; the result is identical to applying Title Case to a fresh string
  (idempotent).
- Catalog contains duplicate article code entries → the first matching entry is used;
  no error is raised.
- Invoice file is extremely large (hundreds of rows) → loading state is shown throughout;
  export still completes correctly.
- Invoice rows have duplicate EAN codes (same product, different sizes) → all rows are
  preserved and appear in the output; deduplication is not performed.

## Requirements *(mandatory)*

### Functional Requirements

**Upload and Validation**

- **FR-001**: The application MUST provide a single-page upload interface with a
  drag-and-drop area and a click-to-browse fallback.
- **FR-002**: The system MUST reject files that are not `.xls` format and display the
  message: "Unsupported file type. Please upload a .xls file."
- **FR-003**: The system MUST reject `.xls` files that do not contain a sheet named
  "Спецификация" and display the message: "The uploaded file is missing the required
  'Спецификация' sheet."
- **FR-004**: The system MUST reject `.xls` files whose "Спецификация" sheet does not
  conform to the expected column layout of format 77078 and display an error identifying
  the mismatch.
- **FR-005**: The system MUST display a loading indicator from the moment processing
  begins until it completes or fails.

**Catalog Lookup**

- **FR-006**: [NEEDS CLARIFICATION: How is the product catalog made available to the
  application? Options: (A) the user uploads both the invoice file and a catalog Excel
  file on the same page; (B) the catalog is pre-loaded by an administrator and stored
  persistently in the application; (C) the catalog is a static file bundled with the
  application and updated by redeployment. This choice significantly affects the upload
  UI and the scope of this feature.]
- **FR-007**: The system MUST look up each invoice row's numeric article code against
  the product catalog to retrieve the bilingual product name (Georgian + English) and
  the retail price in GEL.
- **FR-008**: The system MUST NOT calculate, estimate, or derive the retail price in GEL
  from the invoice purchase price. The retail price MUST always come from the catalog.
- **FR-009**: The system MUST skip any invoice row where the EAN code is empty.
- **FR-010**: When an article code is not found in the catalog, the system MUST leave
  the product name and retail price fields empty in the output and record a warning
  identifying the missing article code.
- **FR-011**: The system MUST display all catalog-lookup warnings to the user after
  processing completes.

**Output Generation**

- **FR-012**: The system MUST generate the Basic Catalog file (лаи_формат_1.xlsx) with
  a sheet named "Лист1" containing: EAN code, bilingual product name, retail price in
  GEL, size, euro size, color, numeric article; rows sorted by numeric article code
  ascending, then by size ascending.
- **FR-013**: The system MUST generate the Extended Catalog file (лаи_формат_2.xlsx)
  with a sheet named "Лист1" containing: all columns from FR-012 plus string article
  code, barcode (identical value to EAN code), and product description converted to
  Title Case; same sort order as FR-012.
- **FR-014**: The system MUST generate the Batumi Receipt file (батуми_формат.xlsx)
  with a sheet named "ნიმუში" containing: EAN code, quantity, purchase price; rows
  sorted by EAN code ascending.
- **FR-015**: The system MUST convert product descriptions from ALL CAPS to Title Case
  (first letter of each word capitalized, all other letters lowercased) when populating
  the Extended Catalog export.
- **FR-016**: The system MUST package лаи_формат_1.xlsx, лаи_формат_2.xlsx, and
  батуми_формат.xlsx into a single ZIP archive and automatically trigger its download
  to the user's device upon successful processing.
- **FR-017**: The system MUST display a clear success message once the ZIP download
  is triggered.
- **FR-018**: The system MUST display a clear error message for any processing failure
  and MUST NOT crash or become unresponsive.

### Key Entities

- **Invoice File**: The uploaded `.xls` file. Contains a sheet named "Спецификация"
  with one row per line item. Each row includes: EAN code, numeric article code, string
  article code, product description (in ALL CAPS), size, euro size, color, quantity,
  and purchase price. Rows with empty EAN codes are excluded from all processing.

- **Product Catalog**: A reference dataset mapping each numeric article code to a
  bilingual product name (Georgian label + English label) and a retail price in GEL.
  Retail prices are manually maintained; they MUST NOT be overridden or recalculated
  by the system.

- **Basic Catalog Export** (лаи_формат_1.xlsx): Output file targeting the primary
  catalog listing use case. Sheet "Лист1". Columns: EAN, bilingual name, GEL price,
  size, euro size, color, numeric article. Sorted: article ↑, size ↑.

- **Extended Catalog Export** (лаи_формат_2.xlsx): Output file for an enriched catalog
  listing. Sheet "Лист1". All columns from Basic Catalog plus: string article code,
  barcode (= EAN), Title Case description. Same sort order.

- **Batumi Receipt Export** (батуми_формат.xlsx): Output file for a purchasing/receiving
  document. Sheet "ნიმუში". Columns: EAN, quantity, purchase price. Sorted: EAN ↑.

- **Export Archive**: The ZIP file delivered to the user containing all three export
  files. Automatically downloaded on success; not stored server-side beyond the request
  lifecycle.

## Assumptions

- Title Case conversion applies standard English rules (capitalize first letter of each
  word, lowercase remainder); no language-specific capitalization exceptions are required.
- Catalog lookup uses exact numeric article code matching only; no fuzzy matching or
  fallback lookup is performed.
- When the catalog contains duplicate entries for the same article code, the first
  matching entry is used.
- "Format 77078" validation means verifying the presence and position of expected columns
  in the "Спецификация" sheet; it is not a metadata field in the file itself.
- The ZIP archive file name may be derived from the source invoice filename or a
  timestamp; the exact naming convention is a technical detail deferred to planning.
- The application is single-user (no authentication, no session management, no concurrent
  user isolation) unless determined otherwise during planning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a valid invoice file and receive a complete ZIP archive
  with all three correctly formatted Excel files within 30 seconds for invoices up to
  500 line items.
- **SC-002**: 100% of rows with empty EAN codes are excluded from all three output files
  with zero false exclusions.
- **SC-003**: Retail prices in лаи_формат_1.xlsx and лаи_формат_2.xlsx always exactly
  match catalog values; no calculated, estimated, or approximated prices appear anywhere
  in the output.
- **SC-004**: Users receive a named warning for every product not found in the catalog
  without the export process failing or the ZIP download being blocked.
- **SC-005**: Users see a distinct, specific error message within 3 seconds for each of
  the three invalid-input conditions (unsupported type, missing sheet, wrong format) —
  no generic "something went wrong" messages appear.
- **SC-006**: The ZIP archive download is triggered automatically on success without
  requiring any additional user action beyond the initial upload.
- **SC-007**: All three output Excel files use the exact sheet names specified
  ("Лист1", "Лист1", "ნიმუში") and exact output filenames (лаи_формат_1.xlsx,
  лаи_формат_2.xlsx, батуми_формат.xlsx).
