import { describe, expect, it } from 'vitest';
import { generateLabel } from './labelGenerator';

describe('generateLabel', () => {
  it('monta etiqueta com calculo, barcode e textos de impressao', () => {
    const label = generateLabel({
      productId: 'banana',
      productName: 'Banana',
      weightKg: 1.25,
      pricePerKg: 5.99,
      productPrefix: '201',
      timestamp: 1713709920000,
    });

    expect(label.productId).toBe('banana');
    expect(label.totalPrice).toBe(7.49);
    expect(label.barcode).toMatch(/^\d{13}$/);
    expect(label.printableText).toContain('PRODUTO: BANANA');
    expect(label.printableText).toContain('PESO: 1.250 kg');
    expect(label.escposText).toContain('PDV ETIQUETA');
  });
});
