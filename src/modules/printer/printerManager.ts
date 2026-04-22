import { PrinterInstaller } from './printerInstaller';
import { PrinterScanner } from './printerScanner';
import {
  InstalledPrinterConfig,
  PrinterAutoConfigResult,
  PrinterScanOptions,
  PrinterScanProgress,
} from './printerTypes';

const STORAGE_KEY = 'pdv_printer_configs_v1';

export class PrinterManager {
  private scanner: PrinterScanner;
  private installer: PrinterInstaller;
  private progressListeners = new Set<(p: PrinterScanProgress) => void>();

  constructor(scanner?: PrinterScanner, installer?: PrinterInstaller) {
    this.scanner = scanner || new PrinterScanner();
    this.installer = installer || new PrinterInstaller();
  }

  onProgress(listener: (p: PrinterScanProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  private emit(progress: PrinterScanProgress) {
    this.progressListeners.forEach((listener) => {
      try {
        listener(progress);
      } catch {
        // ignore listener errors
      }
    });
  }

  private loadSaved(): InstalledPrinterConfig[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as InstalledPrinterConfig[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAll(printers: InstalledPrinterConfig[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(printers));
    if (printers[0]?.address) {
      localStorage.setItem('rm_last_printer_ip', printers[0].address);
    }
  }

  saveAsDefault(printer: InstalledPrinterConfig): InstalledPrinterConfig[] {
    const existing = this.loadSaved().filter((p) => p.id !== printer.id);
    const list = [{ ...printer, isDefault: true }, ...existing.map((p) => ({ ...p, isDefault: false }))];
    this.saveAll(list);
    return list;
  }

  getSavedPrinters(): InstalledPrinterConfig[] {
    return this.loadSaved();
  }

  async autoConfigure(options?: PrinterScanOptions): Promise<PrinterAutoConfigResult> {
    const testMessage = 'TESTE DE IMPRESSAO - PDV OK';

    this.emit({ stage: 'bluetooth_scan', message: 'Procurando impressoras por Bluetooth...', found: 0 });
    const btCandidates = await this.scanner.scanBluetooth(options);

    if (btCandidates.length > 0) {
      this.emit({ stage: 'testing', message: 'Impressora Bluetooth encontrada. Executando teste...', found: btCandidates.length });
      const best = this.installer.chooseBest(btCandidates);
      if (best) {
        const installed = await this.installer.testAndInstall(best, testMessage);
        if (installed) {
          this.saveAsDefault(installed);
          this.emit({ stage: 'completed', message: 'Impressora encontrada e configurada com sucesso.', found: 1 });
          return {
            ok: true,
            printer: installed,
            tested: true,
            message: '? Impressora encontrada!',
            triedBluetooth: true,
            triedNetwork: false,
          };
        }
      }
    }

    this.emit({ stage: 'network_scan', message: 'Sem impressora Bluetooth. Procurando na rede local...', found: 0 });
    const netCandidates = await this.scanner.scanNetwork(options);

    if (netCandidates.length > 0) {
      this.emit({ stage: 'testing', message: 'Impressora de rede encontrada. Executando teste...', found: netCandidates.length });
      const best = this.installer.chooseBest(netCandidates);
      if (best) {
        const installed = await this.installer.testAndInstall(best, testMessage);
        if (installed) {
          this.saveAsDefault(installed);
          this.emit({ stage: 'completed', message: 'Impressora de rede configurada com sucesso.', found: 1 });
          return {
            ok: true,
            printer: installed,
            tested: true,
            message: '? Impressora encontrada!',
            triedBluetooth: true,
            triedNetwork: true,
          };
        }
      }
    }

    this.emit({ stage: 'failed', message: 'Nenhuma impressora encontrada automaticamente.', found: 0 });
    return {
      ok: false,
      tested: false,
      message: 'Nenhuma impressora encontrada automaticamente.',
      triedBluetooth: true,
      triedNetwork: true,
    };
  }
}

export const printerManager = new PrinterManager();
