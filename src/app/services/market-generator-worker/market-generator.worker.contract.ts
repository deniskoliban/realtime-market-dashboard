import type { InstrumentMetrics, ProducerSettings } from '../../core/market.model';

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
