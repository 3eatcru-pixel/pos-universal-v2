import { printerManager } from '../printer/printerManager';
import { printerService } from '../../services/printerService';
import { GeneratedLabel } from './labelGenerator';

export interface LabelPrintResult {
  ok: boolean;
  message: string;
  mode: 'service' | 'raw' | 'browser';
}

function browserFallbackPrint(content: string): boolean {
  try {
    const win = window.open('', '_blank');
    if (!win) return false;
    win.document.write(`<pre>${content}</pre>`);
    win.document.close();
    win.print();
    win.close();
    return true;
  } catch {
    return false;
  }
}

export class LabelPrinter {
  async printLabel(label: GeneratedLabel): Promise<LabelPrintResult> {
    const serviceDefault = printerService.getDefaultPrinter('receipt');

    if (serviceDefault) {
      const ok = await printerService.print(serviceDefault.id, label.escposText);
      if (ok) {
        return { ok: true, message: 'Etiqueta impressa com sucesso.', mode: 'service' };
      }
    }

    const saved = printerManager.getSavedPrinters();
    const defaultSaved = saved.find((p) => p.isDefault) || saved[0];
    if (defaultSaved?.type === 'network') {
      try {
        await fetch(`http://${defaultSaved.address}:${defaultSaved.port || 9100}`, {
          method: 'POST',
          mode: 'no-cors',
          body: label.escposText,
        });
        return { ok: true, message: 'Etiqueta enviada para impressora de rede.', mode: 'raw' };
      } catch {
        // keep fallback below
      }
    }

    const browserOk = browserFallbackPrint(label.printableText);
    if (browserOk) {
      return { ok: true, message: 'Etiqueta aberta para impressão no navegador.', mode: 'browser' };
    }

    return { ok: false, message: 'Nenhuma impressora disponível agora.', mode: 'browser' };
  }
}

export const labelPrinter = new LabelPrinter();
