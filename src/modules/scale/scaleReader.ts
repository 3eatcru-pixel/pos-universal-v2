import { parseScaleData } from './scaleParser';
import { ScaleReading } from './scaleTypes';

export interface ScaleReaderOptions {
  baudRate?: number;
  precision?: number;
  debounceMs?: number;
}

export class ScaleReader {
  private readingListeners = new Set<(reading: ScaleReading) => void>();
  private stopFlag = false;
  private lastEmit = 0;

  onReading(listener: (reading: ScaleReading) => void): () => void {
    this.readingListeners.add(listener);
    return () => this.readingListeners.delete(listener);
  }

  private emit(reading: ScaleReading) {
    this.readingListeners.forEach((listener) => {
      try {
        listener(reading);
      } catch {
        // ignore
      }
    });
  }

  stop() {
    this.stopFlag = true;
  }

  async startSerial(port: any, options?: ScaleReaderOptions): Promise<void> {
    this.stopFlag = false;
    const baudRate = options?.baudRate || 9600;
    const precision = options?.precision ?? 3;
    const debounceMs = options?.debounceMs ?? 250;

    await port.open({
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
    });

    const decoder = new TextDecoder();

    try {
      while (!this.stopFlag && port.readable) {
        const reader = port.readable.getReader();
        try {
          // eslint-disable-next-line no-constant-condition
          while (!this.stopFlag) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value || new Uint8Array(), { stream: true });
            const parsed = parseScaleData(text, { precision });
            if (!parsed) continue;

            const now = Date.now();
            if (now - this.lastEmit < debounceMs) continue;
            this.lastEmit = now;
            this.emit(parsed);
          }
        } finally {
          reader.releaseLock();
        }
      }
    } finally {
      try {
        await port.close();
      } catch {
        // ignore
      }
    }
  }

  startMockRealtime(): () => void {
    this.stopFlag = false;
    const timer = window.setInterval(() => {
      if (this.stopFlag) return;
      const raw = `WT:${(Math.random() * 2).toFixed(3)}`;
      const parsed = parseScaleData(raw, { precision: 3 });
      if (parsed) this.emit(parsed);
    }, 1000);

    return () => {
      this.stopFlag = true;
      window.clearInterval(timer);
    };
  }
}
