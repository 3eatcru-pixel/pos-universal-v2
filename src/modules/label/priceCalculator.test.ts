import { describe, expect, it } from 'vitest';
import { calculatePrice } from './priceCalculator';

describe('calculatePrice', () => {
  it('calcula total com precisao monetaria', () => {
    const result = calculatePrice({ weightKg: 1.25, pricePerKg: 20 });
    expect(result.weightKg).toBe(1.25);
    expect(result.pricePerKg).toBe(20);
    expect(result.totalPrice).toBe(25);
  });

  it('normaliza valores invalidos para zero', () => {
    const result = calculatePrice({ weightKg: Number.NaN, pricePerKg: -10 });
    expect(result.weightKg).toBe(0);
    expect(result.pricePerKg).toBe(0);
    expect(result.totalPrice).toBe(0);
  });
});
