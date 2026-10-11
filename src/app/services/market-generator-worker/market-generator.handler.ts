import init, { MarketGenerator } from '@wasm/market_generator.js';
import {
  Observable,
  Subject,
  defer,
  filter,
  ignoreElements,
  interval,
  map,
  merge,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';

import { INSTRUMENT_NAMES } from '../instrument.constants';
import { MetricsAccumulator } from './metrics-accumulator';
import type { StartRequest, WorkerRequest, WorkerResponse } from './market-generator.contract';
import type { InstrumentMetrics, ProducerSettings } from '../market.model';

const FALLBACK_BATCH_INTERVAL_MS = 500;

export class MarketGeneratorHandler {
  private readonly stop = new Subject<void>();
  private paused = false;
  private accumulator: MetricsAccumulator | null = null;

  constructor(private readonly wasmModuleUrl: string) {}

  handle(request: WorkerRequest): void {
    if (request.kind === 'start') {
      this.start(request);
      return;
    }

    if (request.kind === 'pause') {
      this.pause(request.paused);
    }
  }

  private start(request: StartRequest): void {
    this.stop.next();
    this.paused = false;
    this.accumulator = new MetricsAccumulator(
      INSTRUMENT_NAMES.slice(0, request.settings.instrumentCount),
    );

    loadWasmModule$(this.wasmModuleUrl)
      .pipe(
        switchMap(() => initMarketGenerator$(request.settings.instrumentCount, request.seed)),
        switchMap((generator) =>
          merge(
            this.frozenWhilePaused(this.generationTicks$(request.settings)).pipe(
              map(() => generator.nextBatch(request.settings.updatesPerBatch)),
              tap((batch) => this.accumulator!.add(batch)),
              ignoreElements(),
            ),
            this.frozenWhilePaused(interval(request.publishIntervalMs)).pipe(
              map(() => this.metrics()),
            ),
          ),
        ),
        takeUntil(this.stop),
      )
      .subscribe({
        next: (metrics) => this.sendSnapshot(request.runId, metrics),
        error: (cause) => this.sendFailure(request.runId, cause),
      });
  }

  private pause(paused: boolean): void {
    this.paused = paused;
  }

  private frozenWhilePaused<T>(source: Observable<T>): Observable<T> {
    return source.pipe(filter(() => !this.paused));
  }

  private metrics(): InstrumentMetrics[] {
    return this.accumulator!.metrics();
  }

  private send(response: WorkerResponse): void {
    postMessage(response);
  }

  private sendSnapshot(runId: number, metrics: InstrumentMetrics[]): void {
    this.send({ kind: 'snapshot', runId, metrics });
  }

  private sendFailure(runId: number, cause: unknown): void {
    this.send({ kind: 'error', runId, detail: this.errorMessageOf(cause) });
  }

  private generationTicks$(settings: ProducerSettings): Observable<number> {
    const intervalMs =
      settings.batchIntervalMs > 0 ? settings.batchIntervalMs : FALLBACK_BATCH_INTERVAL_MS;

    return interval(intervalMs);
  }

  private errorMessageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
  }
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

function loadWasmModule$(wasmModuleUrl: string): Observable<void> {
  return defer(async () => {
    await init({ module_or_path: wasmModuleUrl });
  });
}
