import { describe, expect, it } from 'vitest';
import { parseScaleData } from './scaleParser';

describe('parseScaleData', () => {
  it('interpreta payload padrao ST,GS', () => {
    const parsed = parseScaleData('ST,GS,  1.250 kg');
    expect(parsed).not.toBeNull();
    expect(parsed?.weight).toBe(1.25);
    expect(parsed?.unit).toBe('kg');
    expect(parsed?.stable).toBe(true);
  });

  it('interpreta payload WT simples', () => {
    const parsed = parseScaleData('WT:0.350');
    expect(parsed).not.toBeNull();
    expect(parsed?.weight).toBe(0.35);
  });

  it('retorna null para lixo nao parseavel', () => {
    const parsed = parseScaleData('sem peso aqui');
    expect(parsed).toBeNull();
  });
});
