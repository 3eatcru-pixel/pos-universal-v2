import { DetectedPrinter, InstalledPrinterConfig } from './printerTypes';

function escposTestMessage(message: string): Uint8Array {
  const encoder = new TextEncoder();
  const text = encoder.encode(`${message}\n\n`);
  const payload = new Uint8Array(3 + text.length + 1);
  payload.set([0x1b, 0x40, 0x1b], 0); // init + prefix
  payload.set(text, 3);
  payload[payload.length - 1] = 0x0a;
  return payload;
}

async function tryBluetoothWrite(candidate: DetectedPrinter, message: string): Promise<boolean> {
  const device = candidate.meta?.bluetoothDevice as any;
  if (!device?.gatt) return false;

  try {
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    const testPayload = escposTestMessage(message);

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          await ch.writeValue(testPayload);
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function tryNetworkRaw(candidate: DetectedPrinter, message: string): Promise<boolean> {
  if (!candidate.address) return false;
  const body = escposTestMessage(message);
  const port = candidate.port || 9100;

  try {
    await fetch(`http://${candidate.address}:${port}`, {
      method: 'POST',
      mode: 'no-cors',
      body,
    });
    return true;
  } catch {
    return false;
  }
}

function fallbackBrowserPrint(message: string): boolean {
  try {
    const win = window.open('', '_blank');
    if (!win) return false;
    win.document.write(`<pre>${message}</pre>`);
    win.document.close();
    win.print();
    win.close();
    return true;
  } catch {
    return false;
  }
}

export class PrinterInstaller {
  chooseBest(candidates: DetectedPrinter[]): DetectedPrinter | null {
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => b.score - a.score)[0] || null;
  }

  async testAndInstall(candidate: DetectedPrinter, message: string): Promise<InstalledPrinterConfig | null> {
    let ok = false;
    let mode: InstalledPrinterConfig['mode'] = 'raw';

    if (candidate.type === 'bluetooth') {
      ok = await tryBluetoothWrite(candidate, message);
      mode = 'escpos';
    } else if (candidate.type === 'network') {
      ok = await tryNetworkRaw(candidate, message);
      mode = 'raw';
    }

    if (!ok) {
      ok = fallbackBrowserPrint(message);
      mode = 'system';
    }

    if (!ok) return null;

    const config: InstalledPrinterConfig = {
      id: candidate.id,
      type: candidate.type,
      address: candidate.address,
      port: candidate.port,
      model: candidate.model || candidate.name || 'ESC/POS Generic',
      name: candidate.name || 'Impressora PDV',
      lastTest: Date.now(),
      mode,
      isDefault: true,
    };

    return config;
  }
}
