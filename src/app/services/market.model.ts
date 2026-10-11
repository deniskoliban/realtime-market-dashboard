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

export const DEFAULT_PRODUCER_SETTINGS: ProducerSettings = {
  instrumentCount: 50,
  updatesPerBatch: 1000,
  batchIntervalMs: 50,
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
