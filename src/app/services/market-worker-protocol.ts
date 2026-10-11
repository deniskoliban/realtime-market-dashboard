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
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
};

export const DEFAULT_PUBLISH_INTERVAL_MS = 66;

export interface StartRequest {
  kind: 'start';
  runId: number;
  seed: number;
  settings: ProducerSettings;
  publishIntervalMs: number;
}

export interface StopRequest {
  kind: 'stop';
}

export type WorkerRequest = StartRequest | StopRequest;

export interface SnapshotResponse {
  kind: 'snapshot';
  runId: number;
  metrics: InstrumentMetrics[];
}

export interface ErrorResponse {
  kind: 'error';
  runId: number;
  detail: string;
}

export type WorkerResponse = SnapshotResponse | ErrorResponse;
