const SCALE_HINTS = ['scale', 'balanca', 'toledo', 'urano', 'filizola', 'prix'];

import { DetectedScale } from './scaleTypes';

function scoreName(name: string): number {
  const n = (name || '').toLowerCase();
  let score = 0;
  for (const hint of SCALE_HINTS) {
    if (n.includes(hint)) score += 20;
  }
  return score;
}

async function probeHost(ip: string, port: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 450);
  try {
    await fetch(`http://${ip}:${port}`, { method: 'GET', mode: 'no-cors', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function candidateIps(): string[] {
  const fromStorage = localStorage.getItem('rm_known_scale_ips') || '';
  const set = new Set(fromStorage.split(',').map((x) => x.trim()).filter(Boolean));
  for (const base of ['192.168.0', '192.168.1']) {
    for (const host of [20, 30, 40, 50, 60, 100, 150]) {
      set.add(`${base}.${host}`);
    }
  }
  return Array.from(set).slice(0, 24);
}

export class ScaleScanner {
  async scanSerial(): Promise<DetectedScale[]> {
    const nav = navigator as Navigator & {
      serial?: {
        requestPort: () => Promise<any>;
      };
    };

    if (!nav.serial?.requestPort) return [];
    try {
      const port = await nav.serial.requestPort();
      return [
        {
          id: `serial-${Date.now()}`,
          type: 'serial',
          name: 'Balanca Serial',
          model: 'Serial 9600 8N1',
          port: 'serial-port',
          score: 80,
          meta: { serialPort: port },
        },
      ];
    } catch {
      return [];
    }
  }

  async scanBluetooth(): Promise<DetectedScale[]> {
    const nav = navigator as Navigator & { bluetooth?: any };
    if (!nav.bluetooth?.requestDevice) return [];

    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x180f, 0x181d],
      });
      if (!device) return [];
      const score = 50 + scoreName(device.name || '');
      if (score < 50) return [];
      return [
        {
          id: device.id || `bt-scale-${Date.now()}`,
          type: 'bluetooth',
          name: device.name || 'Balanca Bluetooth',
          model: device.name || 'Scale BT',
          score,
          meta: { bluetoothDevice: device },
        },
      ];
    } catch {
      return [];
    }
  }

  async scanNetwork(): Promise<DetectedScale[]> {
    const found: DetectedScale[] = [];
    const ports = [8000, 9100, 23];
    const tasks: Array<() => Promise<void>> = [];

    for (const ip of candidateIps()) {
      for (const port of ports) {
        tasks.push(async () => {
          const alive = await probeHost(ip, port);
          if (!alive) return;
          found.push({
            id: `net-scale-${ip}-${port}`,
            type: 'network',
            name: `Balanca ${ip}`,
            model: 'Scale LAN',
            address: ip,
            port: String(port),
            score: 40 + (port === 8000 ? 15 : 5),
          });
        });
      }
    }

    const chunkSize = 8;
    for (let i = 0; i < tasks.length; i += chunkSize) {
      const chunk = tasks.slice(i, i + chunkSize).map((task) => task());
      await Promise.allSettled(chunk);
    }

    return found.sort((a, b) => b.score - a.score);
  }
}
