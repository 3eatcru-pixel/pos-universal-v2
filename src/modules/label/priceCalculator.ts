export interface PriceCalculationInput {
  weightKg: number;
  pricePerKg: number;
  precision?: number;
}

export interface PriceCalculationResult {
  weightKg: number;
  pricePerKg: number;
  totalPrice: number;
}

function round(value: number, precision: number): number {
  const base = 10 ** precision;
  return Math.round(value * base) / base;
}

export function calculatePrice(input: PriceCalculationInput): PriceCalculationResult {
  const precision = input.precision ?? 2;
  const weightKg = Math.max(0, Number.isFinite(input.weightKg) ? input.weightKg : 0);
  const pricePerKg = Math.max(0, Number.isFinite(input.pricePerKg) ? input.pricePerKg : 0);
  const totalPrice = round(weightKg * pricePerKg, precision);

  return {
    weightKg: round(weightKg, 3),
    pricePerKg: round(pricePerKg, 2),
    totalPrice,
  };
}
