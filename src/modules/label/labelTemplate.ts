export interface LabelTemplateData {
  productName: string;
  weightKg: number;
  pricePerKg: number;
  totalPrice: number;
  timestamp: number;
  barcode: string;
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

export function renderLabelText(data: LabelTemplateData): string {
  return [
    '------------------------',
    `PRODUTO: ${data.productName.toUpperCase()}`,
    '',
    `PESO: ${data.weightKg.toFixed(3)} kg`,
    `R$ / kg: ${data.pricePerKg.toFixed(2)}`,
    '',
    `TOTAL: ${formatMoney(data.totalPrice)}`,
    '',
    `DATA: ${formatDate(data.timestamp)}`,
    '',
    `${data.barcode}`,
    '------------------------',
  ].join('\n');
}

export function renderEscPosText(data: LabelTemplateData): string {
  const lines = [
    '\x1B\x40', // init
    'PDV ETIQUETA',
    `${data.productName.toUpperCase()}`,
    `PESO ${data.weightKg.toFixed(3)}kg`,
    `R$/kg ${data.pricePerKg.toFixed(2)}`,
    `TOTAL ${formatMoney(data.totalPrice)}`,
    `DATA ${formatDate(data.timestamp)}`,
    `${data.barcode}`,
    '\x1D\x56\x00', // cut
  ];
  return lines.join('\n');
}
