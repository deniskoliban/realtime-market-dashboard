import init, { MarketGenerator } from '@wasm/market_generator.js';
import {
  Observable,
  Subject,
  defer,
  ignoreElements,
  interval,
  map,
  merge,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';

import { INSTRUMENT_NAMES } from '../core/instruments';
import { MetricsAccumulator } from '../core/metrics-accumulator';
import type {
  InstrumentMetrics,
  ProducerSettings,
  WorkerRequest,
  WorkerResponse,
} from './market-worker-protocol';

const WASM_MODULE_URL = new URL('market_generator_bg.wasm', self.location.href).href;
const FALLBACK_BATCH_INTERVAL_MS = 500;

const stop = new Subject<void>();

addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.kind === 'start') {
    start(request.runId, request.seed, request.settings, request.publishIntervalMs);
    return;
  }

  if (request.kind === 'stop') {
    stop.next();
  }
});

function start(runId: number, seed: number, settings: ProducerSettings, publishIntervalMs: number): void {
  stop.next();

  const accumulator = new MetricsAccumulator(INSTRUMENT_NAMES.slice(0, settings.instrumentCount));

  loadWasmModule$()
    .pipe(
      switchMap(() => initMarketGenerator$(settings.instrumentCount, seed)),
      switchMap((generator) =>
        merge(
          generationTicks$(settings).pipe(
            map(() => generator.nextBatch(settings.updatesPerBatch)),
            tap((batch) => accumulator.add(batch)),
            ignoreElements(),
          ),
          interval(publishIntervalMs).pipe(map(() => accumulator.metrics())),
        ),
      ),
      takeUntil(stop),
    )
    .subscribe({
      next: (metrics) => sendSnapshot(runId, metrics),
      error: (cause) => sendFailure(runId, cause),
    });
}

function loadWasmModule$(): Observable<void> {
  return defer(async () => {
    await init({ module_or_path: WASM_MODULE_URL });
  });
}

function initMarketGenerator$(instrumentCount: number, seed: number): Observable<MarketGenerator> {
  return defer(() => {
    const generator = new MarketGenerator(instrumentCount, seed);

    return new Observable<MarketGenerator>((subscriber) => {
      subscriber.next(generator);
      return () => generator.free();
    });
  });
}

function generationTicks$(settings: ProducerSettings): Observable<number> {
  const intervalMs =
    settings.batchIntervalMs > 0 ? settings.batchIntervalMs : FALLBACK_BATCH_INTERVAL_MS;

  return interval(intervalMs);
}

function send(response: WorkerResponse): void {
  postMessage(response);
}

function sendSnapshot(runId: number, metrics: InstrumentMetrics[]): void {
  send({ kind: 'snapshot', runId, metrics });
}

function sendFailure(runId: number, cause: unknown): void {
  send({ kind: 'error', runId, detail: errorMessageOf(cause) });
}

function errorMessageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
