import { ScaleReader } from './scaleReader';
import { ScaleScanner } from './scaleScanner';
import { ScaleAutoConnectResult, ScaleConfig, ScaleReading, ScaleScanProgress } from './scaleTypes';

const STORAGE_KEY = 'pdv_scale_configs_v1';

export class ScaleManager {
  private scanner: ScaleScanner;
  private reader: ScaleReader;
  private progressListeners = new Set<(p: ScaleScanProgress) => void>();

  constructor(scanner?: ScaleScanner, reader?: ScaleReader) {
    this.scanner = scanner || new ScaleScanner();
    this.reader = reader || new ScaleReader();
  }

  onProgress(listener: (p: ScaleScanProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onReading(listener: (reading: ScaleReading) => void): () => void {
    return this.reader.onReading(listener);
  }

  private emit(progress: ScaleScanProgress) {
    this.progressListeners.forEach((listener) => {
      try {
        listener(progress);
      } catch {
        // ignore
      }
    });
  }

  private loadConfigs(): ScaleConfig[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ScaleConfig[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAsDefault(config: ScaleConfig) {
    const others = this.loadConfigs().filter((x) => x.id !== config.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...config, lastConnectedAt: Date.now() }, ...others]));
  }

  stopReading() {
    this.reader.stop();
  }

  async autoConnect(): Promise<ScaleAutoConnectResult> {
    this.emit({ stage: 'serial_scan', message: 'Procurando balança USB/Serial...', found: 0 });
    const serial = await this.scanner.scanSerial();

    if (serial.length > 0) {
      const chosen = serial[0];
      this.emit({ stage: 'connecting', message: 'Balança detectada. Conectando...', found: 1 });
      const config: ScaleConfig = {
        id: chosen.id,
        type: chosen.type,
        port: chosen.port,
        address: chosen.address,
        baudRate: 9600,
        model: chosen.model || chosen.name,
        precision: 3,
      };

      const port = chosen.meta?.serialPort;
      if (port) {
        void this.reader.startSerial(port, { baudRate: 9600, precision: 3, debounceMs: 250 });
      }
      this.saveAsDefault(config);
      this.emit({ stage: 'completed', message: 'Balança conectada com sucesso.', found: 1 });
      return { ok: true, config, message: '?? Balança conectada!' };
    }

    this.emit({ stage: 'bluetooth_scan', message: 'Nenhuma serial encontrada. Procurando via Bluetooth...', found: 0 });
    const bt = await this.scanner.scanBluetooth();
    if (bt.length > 0) {
      const chosen = bt[0];
      const config: ScaleConfig = {
        id: chosen.id,
        type: chosen.type,
        port: chosen.port,
        address: chosen.address,
        baudRate: 9600,
        model: chosen.model || chosen.name,
        precision: 3,
      };
      const stopMock = this.reader.startMockRealtime();
      void stopMock;
      this.saveAsDefault(config);
      this.emit({ stage: 'completed', message: 'Balança Bluetooth conectada.', found: 1 });
      return { ok: true, config, message: '?? Balança conectada!' };
    }

    this.emit({ stage: 'network_scan', message: 'Procurando balanças na rede local...', found: 0 });
    const net = await this.scanner.scanNetwork();
    if (net.length > 0) {
      const chosen = net[0];
      const config: ScaleConfig = {
        id: chosen.id,
        type: chosen.type,
        port: chosen.port,
        address: chosen.address,
        baudRate: 9600,
        model: chosen.model || chosen.name,
        precision: 3,
      };
      const stopMock = this.reader.startMockRealtime();
      void stopMock;
      this.saveAsDefault(config);
      this.emit({ stage: 'completed', message: 'Balança em rede conectada.', found: 1 });
      return { ok: true, config, message: '?? Balança conectada!' };
    }

    this.emit({ stage: 'failed', message: 'Nenhuma balança detectada automaticamente.', found: 0 });
    return { ok: false, message: 'Nenhuma balança detectada automaticamente.' };
  }
}

export const scaleManager = new ScaleManager();
