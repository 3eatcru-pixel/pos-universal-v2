import { beforeEach, describe, expect, it, vi } from 'vitest';

const { printLabelMock } = vi.hoisted(() => ({
  printLabelMock: vi.fn(),
}));

vi.mock('./labelPrinter', () => ({
  labelPrinter: {
    printLabel: printLabelMock,
  },
}));

import { labelManager } from './labelManager';

class LocalStorageMock {
  private store = new Map<string, string>();
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] || null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  get length() { return this.store.size; }
}

describe('labelManager', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new LocalStorageMock(),
      configurable: true,
      writable: true,
    });
    printLabelMock.mockReset();
    labelManager.setAutoMode(false);
  });

  it('gera e imprime etiqueta com sucesso', async () => {
    printLabelMock.mockResolvedValue({ ok: true, message: 'ok', mode: 'service' });

    const result = await labelManager.generateAndPrint({
      productId: 'banana',
      productName: 'Banana',
      weightKg: 1.25,
      pricePerKg: 5.99,
      productPrefix: '201',
      timestamp: 1713709920000,
    });

    expect(result.printed).toBe(true);
    expect(result.label.totalPrice).toBe(7.49);
    expect(labelManager.getHistory().length).toBe(1);
    expect(labelManager.getPending().length).toBe(0);
  });

  it('salva pendente quando impressao falha', async () => {
    printLabelMock.mockResolvedValue({ ok: false, message: 'offline', mode: 'browser' });

    const result = await labelManager.generateAndPrint({
      productId: 'banana',
      productName: 'Banana',
      weightKg: 0.5,
      pricePerKg: 10,
      productPrefix: '201',
      timestamp: 1713709920000,
    });

    expect(result.printed).toBe(false);
    expect(labelManager.getHistory().length).toBe(1);
    expect(labelManager.getPending().length).toBe(1);
  });

  it('auto etiqueta respeita modo e janela minima', async () => {
    printLabelMock.mockResolvedValue({ ok: true, message: 'ok', mode: 'service' });
    labelManager.setAutoMode(true);

    const first = await labelManager.tryAutoLabel({
      productId: 'banana',
      productName: 'Banana',
      pricePerKg: 5,
      weightKg: 1,
      productPrefix: '201',
    });

    const second = await labelManager.tryAutoLabel({
      productId: 'banana',
      productName: 'Banana',
      pricePerKg: 5,
      weightKg: 1.2,
      productPrefix: '201',
    });

    expect(first.generated).toBe(true);
    expect(second.generated).toBe(false);
  });
});
