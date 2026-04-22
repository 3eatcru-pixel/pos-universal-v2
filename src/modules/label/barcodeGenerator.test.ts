import { describe, expect, it } from 'vitest';
import { generateBarcode } from './barcodeGenerator';

describe('generateBarcode', () => {
  it('gera codigo interno e EAN-13 valido', () => {
    const result = generateBarcode({ productPrefix: '200', weightKg: 1.25, timestamp: 1713709920000 });
    expect(result.internalCode).toBe('200001250');
    expect(result.ean13).toMatch(/^\d{13}$/);
  });

  it('usa prefixo padrao quando prefixo invalido', () => {
    const result = generateBarcode({ productPrefix: 'xx', weightKg: 0.35 });
    expect(result.internalCode.startsWith('22')).toBe(true);
    expect(result.ean13.length).toBe(13);
  });
});
