export interface InvoiceRow {
  eanCode: string;
  model: string;
  article: string;
  name: string;
  size: string;
  euroSize: string;
  parameters: string;
  quantity: number;
  purchasePrice: number;
  wholesaleMarkup: number;
  retailPrice: number;
}
