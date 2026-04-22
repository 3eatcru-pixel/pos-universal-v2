export interface BarcodeInput {
  productPrefix?: string;
  weightKg: number;
  timestamp?: number;
}

export interface BarcodeResult {
  internalCode: string;
  ean13: string;
}

function normalizePrefix(prefix?: string): string {
  const raw = (prefix || '200').replace(/\D/g, '').slice(0, 3);
  return raw.padStart(3, '2');
}

function dayOfYear(ts: number): number {
  const date = new Date(ts);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function ean13Checksum(base12: string): string {
  const digits = base12.split('').map((d) => Number.parseInt(d, 10));
  const sum = digits.reduce((acc, digit, idx) => {
    const weight = idx % 2 === 0 ? 1 : 3;
    return acc + digit * weight;
  }, 0);
  const mod = sum % 10;
  const check = mod === 0 ? 0 : 10 - mod;
  return String(check);
}

export function generateBarcode(input: BarcodeInput): BarcodeResult {
  const ts = input.timestamp || Date.now();
  const prefix = normalizePrefix(input.productPrefix);
  const grams = Math.max(0, Math.round((input.weightKg || 0) * 1000));
  const gramsPart = String(Math.min(grams, 999999)).padStart(6, '0');
  const dayPart = String(dayOfYear(ts)).padStart(3, '0').slice(-3);

  // 3 + 6 + 3 = 12 digits (EAN-13 base)
  const base12 = `${prefix}${gramsPart}${dayPart}`;
  const checksum = ean13Checksum(base12);
  const ean13 = `${base12}${checksum}`;

  return {
    internalCode: `${prefix}${gramsPart}`,
    ean13,
  };
}
