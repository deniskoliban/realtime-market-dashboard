import { INSTRUMENT_NAMES } from './instrument.constants';

export interface InstrumentMetrics {
  instrument: string;
  lastTradeCents: number | null;
  spreadCents: number | null;
  volume: number;
  vwapCents: number | null;
  imbalance: number | null;
}

export interface ProducerSettings {
  instrumentCount: number;
  updatesPerBatch: number;
  batchIntervalMs: number;
}

export interface SettingRange {
  min: number;
  max: number;
}

export const DEFAULT_PRODUCER_SETTINGS: ProducerSettings = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
};

export const PRODUCER_SETTINGS_RANGES: Record<keyof ProducerSettings, SettingRange> = {
  instrumentCount: { min: 1, max: 50 },
  updatesPerBatch: { min: 1, max: 1000 },
  batchIntervalMs: { min: 50, max: 2000 },
};

export function unavailableMetrics(instrumentCount: number): InstrumentMetrics[] {
  return INSTRUMENT_NAMES.slice(0, instrumentCount).map((instrument) => ({
    instrument,
    lastTradeCents: null,
    spreadCents: null,
    volume: 0,
    vwapCents: null,
    imbalance: null,
  }));
}
