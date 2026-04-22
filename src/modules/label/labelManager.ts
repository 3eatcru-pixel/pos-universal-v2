import { generateLabel, GeneratedLabel, LabelGenerateInput } from './labelGenerator';
import { labelPrinter } from './labelPrinter';

const HISTORY_KEY = 'pdv_label_history_v1';
const PENDING_KEY = 'pdv_label_pending_v1';

export interface LabelHistoryEntry {
  id: string;
  productId: string;
  peso: number;
  preco: number;
  timestamp: number;
  barcode: string;
  printed: boolean;
  label: GeneratedLabel;
}

function readList<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]') as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export class LabelManager {
  private autoMode = false;
  private lastAutoAt = 0;
  private lastAutoWeight = 0;

  setAutoMode(enabled: boolean) {
    this.autoMode = enabled;
  }

  isAutoModeEnabled(): boolean {
    return this.autoMode;
  }

  getHistory(): LabelHistoryEntry[] {
    return readList<LabelHistoryEntry>(HISTORY_KEY).sort((a, b) => b.timestamp - a.timestamp);
  }

  getPending(): GeneratedLabel[] {
    return readList<GeneratedLabel>(PENDING_KEY).sort((a, b) => b.timestamp - a.timestamp);
  }

  private pushHistory(entry: LabelHistoryEntry) {
    const history = this.getHistory();
    saveList(HISTORY_KEY, [entry, ...history].slice(0, 500));
  }

  private pushPending(label: GeneratedLabel) {
    const pending = this.getPending();
    saveList(PENDING_KEY, [label, ...pending].slice(0, 200));
  }

  async generateAndPrint(input: LabelGenerateInput): Promise<{ label: GeneratedLabel; printed: boolean; message: string }> {
    const label = generateLabel(input);
    const print = await labelPrinter.printLabel(label);

    const entry: LabelHistoryEntry = {
      id: label.id,
      productId: label.productId,
      peso: label.weightKg,
      preco: label.totalPrice,
      timestamp: label.timestamp,
      barcode: label.barcode,
      printed: print.ok,
      label,
    };

    this.pushHistory(entry);
    if (!print.ok) {
      this.pushPending(label);
      return { label, printed: false, message: 'Sem impressora: etiqueta salva para reimpressao.' };
    }

    return { label, printed: true, message: print.message };
  }

  async reprint(labelId: string): Promise<{ ok: boolean; message: string }> {
    const history = this.getHistory();
    const entry = history.find((h) => h.id === labelId);
    if (!entry) return { ok: false, message: 'Etiqueta nao encontrada no historico.' };

    const print = await labelPrinter.printLabel(entry.label);
    return { ok: print.ok, message: print.message };
  }

  async tryAutoLabel(input: Omit<LabelGenerateInput, 'weightKg'> & { weightKg: number }): Promise<{ generated: boolean; message: string; label?: GeneratedLabel }> {
    if (!this.autoMode) return { generated: false, message: 'Auto etiqueta desativado.' };

    const now = Date.now();
    const minIntervalMs = 2500;
    const minWeightDelta = 0.02;

    if (now - this.lastAutoAt < minIntervalMs) {
      return { generated: false, message: 'Aguardando janela de impressao.' };
    }

    if (Math.abs(input.weightKg - this.lastAutoWeight) < minWeightDelta) {
      return { generated: false, message: 'Variacao de peso muito pequena.' };
    }

    const result = await this.generateAndPrint(input);
    this.lastAutoAt = now;
    this.lastAutoWeight = input.weightKg;

    return { generated: true, message: result.message, label: result.label };
  }
}

export const labelManager = new LabelManager();
