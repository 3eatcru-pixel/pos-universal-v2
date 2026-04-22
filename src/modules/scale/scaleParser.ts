import { ScaleReading } from './scaleTypes';

const PATTERNS = [
  /(?:ST|WT|GS|US)?\s*[:,]?\s*([+-]?\d+[\.,]?\d*)\s*(kg|g)?/i,
  /([+-]?\d+[\.,]\d+)\s*(kg|g)/i,
  /([+-]?\d+)\s*(kg|g)/i,
];

export interface ParseScaleOptions {
  defaultUnit?: 'kg' | 'g';
  precision?: number;
}

export function parseScaleData(rawInput: string, options?: ParseScaleOptions): ScaleReading | null {
  const raw = (rawInput || '').trim();
  if (!raw) return null;

  const defaultUnit = options?.defaultUnit || 'kg';
  const precision = options?.precision ?? 3;

  for (const pattern of PATTERNS) {
    const match = raw.match(pattern);
    if (!match) continue;

    const numeric = (match[1] || '').replace(',', '.').trim();
    const parsed = Number.parseFloat(numeric);
    if (!Number.isFinite(parsed)) continue;

    const unit = ((match[2] || defaultUnit).toLowerCase() === 'g' ? 'g' : 'kg') as 'kg' | 'g';
    const weightKg = unit === 'g' ? parsed / 1000 : parsed;
    const rounded = Number(weightKg.toFixed(precision));

    return {
      raw,
      weight: rounded,
      unit: 'kg',
      stable: !/US|unstable/i.test(raw),
      timestamp: Date.now(),
    };
  }

  return null;
}
