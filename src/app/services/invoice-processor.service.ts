import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { InvoiceRow } from '../models/invoice-row.model';
import {
  ExportFiles,
  MissingColumnsError,
  MissingSheetError,
  ProcessingError,
  ProcessingSummary,
  UnsupportedFileTypeError,
} from '../models/processing-result.model';

const SHEET_NAME = 'Спецификация';

const REQUIRED_COLUMNS = [
  'Код ЕАН',
  'Модель',
  'Артикул',
  'Наименование',
  'Размер',
  'Размер (евро)',
  'Параметры',
  'Кол-во',
  'Цена',
] as const;

const MARKUP_COEFFICIENT = 7.85;

@Injectable({ providedIn: 'root' })
export class InvoiceProcessorService {

  async processFile(file: File): Promise<ProcessingSummary> {
    try {
      this.validateFileType(file);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      this.validateSheet(workbook);
      const sheet = workbook.Sheets[SHEET_NAME];
      this.validateColumns(sheet);

      const { rows, totalRowsInSheet, skippedRows } = this.parseRows(sheet);

      const exports = this.generateExports(rows);
      await this.downloadZip(exports, file.name);

      return { totalRowsInSheet, skippedRows, exportedRows: rows.length };
    } catch (err) {
      if (
        err instanceof UnsupportedFileTypeError ||
        err instanceof MissingSheetError ||
        err instanceof MissingColumnsError
      ) {
        throw err;
      }
      throw new ProcessingError(err);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  private validateFileType(file: File): void {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xls')) {
      throw new UnsupportedFileTypeError();
    }
  }

  private validateSheet(workbook: XLSX.WorkBook): void {
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
      throw new MissingSheetError();
    }
  }

  private validateColumns(sheet: XLSX.WorkSheet): void {
    const headerRow = (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0]) ?? [];
    const missing = REQUIRED_COLUMNS.filter(col => !headerRow.includes(col));
    if (missing.length > 0) {
      throw new MissingColumnsError(missing);
    }
  }

  // ── Parsing ────────────────────────────────────────────────────────────────

  private parseRows(sheet: XLSX.WorkSheet): {
    rows: InvoiceRow[];
    totalRowsInSheet: number;
    skippedRows: number;
  } {
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const totalRowsInSheet = raw.length;
    let skippedRows = 0;

    const rows: InvoiceRow[] = [];
    for (const r of raw) {
      const eanCode = String(r['Код ЕАН'] ?? '').trim();
      if (!eanCode) {
        skippedRows++;
        continue;
      }
      const purchasePrice = Number(r['Цена'] ?? 0);
      rows.push({
        eanCode,
        model: String(r['Модель'] ?? ''),
        article: String(r['Артикул'] ?? ''),
        name: String(r['Наименование'] ?? ''),
        size: String(r['Размер'] ?? ''),
        euroSize: String(r['Размер (евро)'] ?? ''),
        parameters: String(r['Параметры'] ?? ''),
        quantity: Number(r['Кол-во'] ?? 0),
        purchasePrice,
        wholesaleMarkup: Number(r['Опт. надб., %'] ?? 0),
        retailPrice: this.calcRetailPrice(purchasePrice),
      });
    }

    return { rows, totalRowsInSheet, skippedRows };
  }

  // ── Transformations ────────────────────────────────────────────────────────

  private toTitleCase(value: string): string {
    return value.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  private calcRetailPrice(purchasePrice: number): number {
    return Math.round(purchasePrice * MARKUP_COEFFICIENT);
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  private sortForCatalog(rows: InvoiceRow[]): InvoiceRow[] {
    return [...rows].sort((a, b) => {
      const byModel = String(a.model).localeCompare(String(b.model), undefined, { numeric: true });
      if (byModel !== 0) return byModel;
      return String(a.size).localeCompare(String(b.size), undefined, { numeric: true });
    });
  }

  private sortForBatumi(rows: InvoiceRow[]): InvoiceRow[] {
    return [...rows].sort((a, b) =>
      String(a.eanCode).localeCompare(String(b.eanCode), undefined, { numeric: true }),
    );
  }

  // ── Export builders ────────────────────────────────────────────────────────

  private generateExports(rows: InvoiceRow[]): ExportFiles {
    return {
      basicCatalog: this.buildBasicCatalog(rows),
      extendedCatalog: this.buildExtendedCatalog(rows),
      batumiReceipt: this.buildBatumiReceipt(rows),
    };
  }

  private buildBasicCatalog(rows: InvoiceRow[]): Uint8Array {
    const sorted = this.sortForCatalog(rows);
    const headers = [
      'Код', 'Название', 'საცალო Розничный', 'Размер', 'Размер (евр)', 'Цвет', 'Артикул',
    ];
    const data = sorted.map(r => [
      r.eanCode,
      this.toTitleCase(r.name),
      r.retailPrice,
      r.size,
      r.euroSize,
      r.parameters,
      r.model,
    ]);
    return this.buildXlsx([headers, ...data], 'Лист1');
  }

  private buildExtendedCatalog(rows: InvoiceRow[]): Uint8Array {
    const sorted = this.sortForCatalog(rows);
    const headers = [
      'Код', 'Название', 'საცალო Розничный', 'Размер', 'Размер (евр)', 'Цвет', 'Артикул',
      'არტიკული2', 'Штрихкод', 'Описание',
    ];
    const data = sorted.map(r => [
      r.eanCode,
      this.toTitleCase(r.name),
      r.retailPrice,
      r.size,
      r.euroSize,
      r.parameters,
      r.model,
      r.article,
      r.eanCode,
      this.toTitleCase(r.name),
    ]);
    return this.buildXlsx([headers, ...data], 'Лист1');
  }

  private buildBatumiReceipt(rows: InvoiceRow[]): Uint8Array {
    const sorted = this.sortForBatumi(rows);
    const headers = ['კოდი', 'რაოდენობა', 'თვითღირებულება'];
    const data = sorted.map(r => [r.eanCode, r.quantity, r.purchasePrice]);
    return this.buildXlsx([headers, ...data], 'ნიმუში');
  }

  private buildXlsx(aoa: unknown[][], sheetName: string): Uint8Array {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const result = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return result instanceof Uint8Array ? result : new Uint8Array(result as number[]);
  }

  // ── Download ───────────────────────────────────────────────────────────────

  private async downloadZip(files: ExportFiles, sourceFileName: string): Promise<void> {
    const zip = new JSZip();
    zip.file('basic-catalog.xlsx', files.basicCatalog);
    zip.file('extended-catalog.xlsx', files.extendedCatalog);
    zip.file('batumi-receipt.xlsx', files.batumiReceipt);

    const blob = await zip.generateAsync({ type: 'blob' });
    const baseName = sourceFileName.replace(/\.[^.]+$/, '');
    const zipName = `${baseName}-export.zip`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = zipName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
