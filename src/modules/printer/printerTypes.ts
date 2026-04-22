export type PrinterDiscoveryType = 'bluetooth' | 'network';

export interface DetectedPrinter {
  id: string;
  type: PrinterDiscoveryType;
  name: string;
  model?: string;
  address: string;
  port?: number;
  score: number;
  meta?: Record<string, unknown>;
}

export interface PrinterScanProgress {
  stage: 'idle' | 'bluetooth_scan' | 'network_scan' | 'testing' | 'completed' | 'failed';
  message: string;
  found: number;
}

export interface InstalledPrinterConfig {
  id: string;
  type: PrinterDiscoveryType;
  address: string;
  port?: number;
  model: string;
  name: string;
  lastTest: number;
  mode: 'escpos' | 'raw' | 'system';
  isDefault?: boolean;
}

export interface PrinterAutoConfigResult {
  ok: boolean;
  printer?: InstalledPrinterConfig;
  tested: boolean;
  message: string;
  triedBluetooth: boolean;
  triedNetwork: boolean;
}

export interface PrinterScanOptions {
  networkPorts?: number[];
  bluetoothNameHints?: string[];
  signal?: AbortSignal;
}
