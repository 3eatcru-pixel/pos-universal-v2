import { DetectedPrinter, PrinterScanOptions } from './printerTypes';

const DEFAULT_HINTS = ['printer', 'pos', 'thermal', 'epson', 'bematech', 'elgin', 'daruma'];
const DEFAULT_PORTS = [9100, 515];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function safeLower(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase();
}

function scoreByName(name: string, hints: string[]): number {
  const n = safeLower(name);
  if (!n) return 0;
  let score = 0;
  for (const hint of hints) {
    if (n.includes(safeLower(hint))) score += 20;
  }
  if (n.includes('esc') || n.includes('tm-')) score += 10;
  return score;
}

async function probeHttpPort(ip: string, port: number, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`http://${ip}:${port}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function localCandidatesFromStorage(): string[] {
  const set = new Set<string>();
  const known = localStorage.getItem('rm_known_printer_ips');
  if (known) {
    for (const ip of known.split(',').map((s) => s.trim()).filter(Boolean)) set.add(ip);
  }
  const current = localStorage.getItem('rm_last_printer_ip');
  if (current) set.add(current);
  return Array.from(set);
}

function generateLanCandidates(): string[] {
  const pool = new Set<string>();
  for (const ip of localCandidatesFromStorage()) pool.add(ip);

  // Lightweight fallback ranges; intentionally small to avoid UI freeze.
  const commonBases = ['192.168.0', '192.168.1', '10.0.0'];
  for (const base of commonBases) {
    for (const host of [20, 21, 22, 30, 40, 50, 60, 100, 150, 200]) {
      pool.add(`${base}.${host}`);
    }
  }
  return Array.from(pool).slice(0, 40);
}

export class PrinterScanner {
  async scanBluetooth(options?: PrinterScanOptions): Promise<DetectedPrinter[]> {
    const hints = options?.bluetoothNameHints?.length ? options.bluetoothNameHints : DEFAULT_HINTS;
    const nav = navigator as Navigator & { bluetooth?: any };
    if (!nav.bluetooth?.requestDevice) return [];

    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x18f0, 0x180a],
      });
      if (!device) return [];

      const score = 60 + scoreByName(device.name || '', hints);
      if (score < 60) return [];

      return [
        {
          id: device.id || `bt-${Date.now()}`,
          type: 'bluetooth',
          name: device.name || 'Impressora Bluetooth',
          model: device.name || 'Bluetooth ESC/POS',
          address: device.id || 'bluetooth-device',
          score,
          meta: { bluetoothDevice: device },
        },
      ];
    } catch {
      return [];
    }
  }

  async scanNetwork(options?: PrinterScanOptions): Promise<DetectedPrinter[]> {
    const ports = options?.networkPorts?.length ? options.networkPorts : DEFAULT_PORTS;
    const ips = generateLanCandidates();
    const found: DetectedPrinter[] = [];
    const tasks: Array<() => Promise<void>> = [];
    for (const ip of ips) {
      for (const port of ports) {
        tasks.push(async () => {
          if (options?.signal?.aborted) return;
          const alive = await probeHttpPort(ip, port, 450);
          if (!alive) return;
          found.push({
            id: `net-${ip}-${port}`,
            type: 'network',
            name: `Printer ${ip}`,
            model: port === 9100 ? 'ESC/POS LAN' : 'LPD LAN',
            address: ip,
            port,
            score: 50 + (port === 9100 ? 20 : 10),
          });
        });
      }
    }

    const chunkSize = 8;
    for (let i = 0; i < tasks.length; i += chunkSize) {
      const chunk = tasks.slice(i, i + chunkSize).map((task) => task());
      await Promise.allSettled(chunk);
      await delay(10);
      if (options?.signal?.aborted) break;
    }

    return found.sort((a, b) => b.score - a.score);
  }
}
