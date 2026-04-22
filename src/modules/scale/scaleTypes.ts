export type ScaleConnectionType = 'usb' | 'serial' | 'bluetooth' | 'network' | 'manual';

export interface DetectedScale {
  id: string;
  type: ScaleConnectionType;
  name: string;
  model?: string;
  port?: string;
  address?: string;
  score: number;
  meta?: Record<string, unknown>;
}

export interface ScaleReading {
  raw: string;
  weight: number;
  unit: 'kg' | 'g';
  stable: boolean;
  timestamp: number;
}

export interface ScaleConfig {
  id: string;
  type: ScaleConnectionType;
  port?: string;
  address?: string;
  baudRate: number;
  model: string;
  precision: number;
  lastReading?: number;
  lastConnectedAt?: number;
}

export interface ScaleScanProgress {
  stage: 'idle' | 'serial_scan' | 'bluetooth_scan' | 'network_scan' | 'connecting' | 'completed' | 'failed';
  message: string;
  found: number;
}

export interface ScaleAutoConnectResult {
  ok: boolean;
  config?: ScaleConfig;
  message: string;
}
