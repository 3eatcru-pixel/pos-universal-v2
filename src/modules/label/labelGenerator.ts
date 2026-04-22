import { generateBarcode } from './barcodeGenerator';
import { calculatePrice } from './priceCalculator';
import { LabelTemplateData, renderEscPosText, renderLabelText } from './labelTemplate';

export interface LabelGenerateInput {
  productId: string;
  productName: string;
  weightKg: number;
  pricePerKg: number;
  timestamp?: number;
  productPrefix?: string;
}

export interface GeneratedLabel {
  id: string;
  productId: string;
  productName: string;
  weightKg: number;
  pricePerKg: number;
  totalPrice: number;
  barcode: string;
  internalCode: string;
  timestamp: number;
  printableText: string;
  escposText: string;
  templateName: string;
}

export function generateLabel(input: LabelGenerateInput): GeneratedLabel {
  const timestamp = input.timestamp || Date.now();
  const price = calculatePrice({ weightKg: input.weightKg, pricePerKg: input.pricePerKg });
  const barcode = generateBarcode({
    productPrefix: input.productPrefix,
    weightKg: price.weightKg,
    timestamp,
  });

  const templateData: LabelTemplateData = {
    productName: input.productName,
    weightKg: price.weightKg,
    pricePerKg: price.pricePerKg,
    totalPrice: price.totalPrice,
    timestamp,
    barcode: barcode.ean13,
  };

  return {
    id: `lbl-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    productId: input.productId,
    productName: input.productName,
    weightKg: price.weightKg,
    pricePerKg: price.pricePerKg,
    totalPrice: price.totalPrice,
    barcode: barcode.ean13,
    internalCode: barcode.internalCode,
    timestamp,
    printableText: renderLabelText(templateData),
    escposText: renderEscPosText(templateData),
    templateName: 'default_v1',
  };
}
