import { InvoiceProcessorService } from './invoice-processor.service';
import { InvoiceRow } from '../models/invoice-row.model';
import {
  MissingColumnsError,
  MissingSheetError,
  UnsupportedFileTypeError,
} from '../models/processing-result.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    eanCode: '1234567890123',
    model: '10001',
    article: 'ART-001',
    name: 'RED COTTON SNEAKERS',
    size: '38',
    euroSize: '38',
    parameters: 'Red',
    quantity: 2,
    purchasePrice: 10,
    wholesaleMarkup: 0,
    retailPrice: 0,
    ...overrides,
  };
}

/** Minimal valid .xls ArrayBuffer stub: SheetJS will not parse it — used for file-type tests via filename only */
function makeXlsFile(filename: string, type = 'application/vnd.ms-excel'): File {
  const bytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]); // BIFF8 magic bytes
  return new File([bytes], filename, { type });
}

// ---------------------------------------------------------------------------
// Unit tests for pure helper methods (accessed via the service instance)
// ---------------------------------------------------------------------------

describe('InvoiceProcessorService — pure helpers', () => {
  let service: InvoiceProcessorService;

  beforeEach(() => {
    service = new InvoiceProcessorService();
  });

  // ---- toTitleCase --------------------------------------------------------
  describe('toTitleCase()', () => {
    it('converts ALL CAPS to Title Case', () => {
      expect(service['toTitleCase']('RED COTTON SNEAKERS')).toBe('Red Cotton Sneakers');
    });

    it('converts lowercase to Title Case', () => {
      expect(service['toTitleCase']('red cotton sneakers')).toBe('Red Cotton Sneakers');
    });

    it('is idempotent on already Title Case text', () => {
      expect(service['toTitleCase']('Red Cotton Sneakers')).toBe('Red Cotton Sneakers');
    });

    it('handles empty string', () => {
      expect(service['toTitleCase']('')).toBe('');
    });

    it('handles single word', () => {
      expect(service['toTitleCase']('BOOTS')).toBe('Boots');
    });
  });

  // ---- calcRetailPrice ----------------------------------------------------
  describe('calcRetailPrice()', () => {
    it('multiplies by 7.85 and rounds', () => {
      expect(service['calcRetailPrice'](10)).toBe(79);     // 10 * 7.85 = 78.5 → 79 (rounds half up)
      expect(service['calcRetailPrice'](12.5)).toBe(98);   // 12.5 * 7.85 = 98.125 → 98
      expect(service['calcRetailPrice'](20)).toBe(157);    // 20 * 7.85 = 157
    });

    it('returns 0 for 0 price', () => {
      expect(service['calcRetailPrice'](0)).toBe(0);
    });
  });

  // ---- sort orders --------------------------------------------------------
  describe('sortForCatalog()', () => {
    it('sorts by model (numeric) ascending then size (numeric) ascending', () => {
      const rows: InvoiceRow[] = [
        makeRow({ model: '10002', size: '36' }),
        makeRow({ model: '10001', size: '38' }),
        makeRow({ model: '10001', size: '36' }),
        makeRow({ model: '10002', size: '40' }),
      ];
      const sorted = service['sortForCatalog']([...rows]);
      expect(sorted.map(r => `${r.model}-${r.size}`)).toEqual([
        '10001-36', '10001-38', '10002-36', '10002-40',
      ]);
    });

    it('sorts numeric article codes correctly (9 before 10)', () => {
      const rows: InvoiceRow[] = [
        makeRow({ model: '10', size: '36' }),
        makeRow({ model: '9', size: '36' }),
      ];
      const sorted = service['sortForCatalog']([...rows]);
      expect(sorted[0].model).toBe('9');
    });
  });

  describe('sortForBatumi()', () => {
    it('sorts by EAN code ascending', () => {
      const rows: InvoiceRow[] = [
        makeRow({ eanCode: '3000000000003' }),
        makeRow({ eanCode: '1000000000001' }),
        makeRow({ eanCode: '2000000000002' }),
      ];
      const sorted = service['sortForBatumi']([...rows]);
      expect(sorted.map(r => r.eanCode)).toEqual([
        '1000000000001', '2000000000002', '3000000000003',
      ]);
    });
  });

  // ---- buildBasicCatalog --------------------------------------------------
  describe('buildBasicCatalog()', () => {
    it('returns a non-empty Uint8Array', () => {
      const rows = [makeRow()];
      const result = service['buildBasicCatalog'](rows);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ---- buildExtendedCatalog -----------------------------------------------
  describe('buildExtendedCatalog()', () => {
    it('returns a non-empty Uint8Array', () => {
      const rows = [makeRow()];
      const result = service['buildExtendedCatalog'](rows);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ---- buildBatumiReceipt -------------------------------------------------
  describe('buildBatumiReceipt()', () => {
    it('returns a non-empty Uint8Array', () => {
      const rows = [makeRow()];
      const result = service['buildBatumiReceipt'](rows);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// File-type validation
// ---------------------------------------------------------------------------

describe('InvoiceProcessorService — file-type validation', () => {
  let service: InvoiceProcessorService;

  beforeEach(() => {
    service = new InvoiceProcessorService();
  });

  it('throws UnsupportedFileTypeError for a .csv file', async () => {
    const csv = new File(['a,b'], 'invoice.csv', { type: 'text/csv' });
    await expect(service.processFile(csv)).rejects.toBeInstanceOf(UnsupportedFileTypeError);
  });

  it('throws UnsupportedFileTypeError for a .xlsx file', async () => {
    const xlsx = new File([new Uint8Array(4)], 'invoice.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await expect(service.processFile(xlsx)).rejects.toBeInstanceOf(UnsupportedFileTypeError);
  });

  it('throws UnsupportedFileTypeError for a .pdf file', async () => {
    const pdf = new File([new Uint8Array(4)], 'invoice.pdf', { type: 'application/pdf' });
    await expect(service.processFile(pdf)).rejects.toBeInstanceOf(UnsupportedFileTypeError);
  });
});

// ---------------------------------------------------------------------------
// Sheet and column validation (using real SheetJS-generated workbooks)
// ---------------------------------------------------------------------------

describe('InvoiceProcessorService — sheet/column validation', () => {
  let service: InvoiceProcessorService;

  beforeEach(() => {
    service = new InvoiceProcessorService();
  });

  it('throws MissingSheetError when Спецификация sheet is absent', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A', 'B']]), 'OtherSheet');
    const bytes = XLSX.write(wb, { bookType: 'xls', type: 'array' }) as ArrayBuffer;
    const file = new File([bytes], 'test.xls', { type: 'application/vnd.ms-excel' });
    await expect(service.processFile(file)).rejects.toBeInstanceOf(MissingSheetError);
  });

  it('throws MissingColumnsError listing missing columns', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Код ЕАН', 'Модель']]),
      'Спецификация',
    );
    const bytes = XLSX.write(wb, { bookType: 'xls', type: 'array' }) as ArrayBuffer;
    const file = new File([bytes], 'test.xls', { type: 'application/vnd.ms-excel' });
    await expect(service.processFile(file)).rejects.toBeInstanceOf(MissingColumnsError);
  });
});

// ---------------------------------------------------------------------------
// Empty EAN filtering
// ---------------------------------------------------------------------------

describe('InvoiceProcessorService — empty EAN filtering', () => {
  let service: InvoiceProcessorService;

  beforeEach(() => {
    service = new InvoiceProcessorService();
  });

  async function makeFileWithRows(
    rows: (string | number)[][],
  ): Promise<File> {
    const XLSX = await import('xlsx');
    const headers = [
      'Код ЕАН', 'Модель', 'Артикул', 'Наименование',
      'Размер', 'Размер (евро)', 'Параметры', 'Кол-во', 'Цена', 'Опт. надб., %',
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([headers, ...rows]),
      'Спецификация',
    );
    const bytes = XLSX.write(wb, { bookType: 'xls', type: 'array' }) as ArrayBuffer;
    return new File([bytes], 'test.xls', { type: 'application/vnd.ms-excel' });
  }

  it('exports only rows with non-empty EAN', async () => {
    const file = await makeFileWithRows([
      ['1234567890123', '10001', 'ART-1', 'PRODUCT A', '38', '38', 'Red', 2, 10, 0],
      ['', '10002', 'ART-2', 'PRODUCT B', '40', '40', 'Blue', 1, 12, 0],
      ['9876543210987', '10003', 'ART-3', 'PRODUCT C', '36', '36', 'Green', 3, 8, 0],
    ]);
    const summary = await service.processFile(file);
    expect(summary.exportedRows).toBe(2);
    expect(summary.skippedRows).toBe(1);
    expect(summary.totalRowsInSheet).toBe(3);
  });

  it('returns exportedRows=0 when all rows have empty EAN', async () => {
    const file = await makeFileWithRows([
      ['', '10001', 'ART-1', 'PRODUCT A', '38', '38', 'Red', 2, 10, 0],
      ['', '10002', 'ART-2', 'PRODUCT B', '40', '40', 'Blue', 1, 12, 0],
    ]);
    const summary = await service.processFile(file);
    expect(summary.exportedRows).toBe(0);
    expect(summary.skippedRows).toBe(2);
  });
});
