import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, defer, filter, fromEvent, map, merge } from 'rxjs';

import { DEFAULT_PUBLISH_INTERVAL_MS } from './market-worker-protocol';

import type {
  InstrumentMetrics,
  ProducerSettings,
  WorkerRequest,
  WorkerResponse,
} from './market-worker-protocol';

export const MARKET_WORKER = new InjectionToken<Worker>('MARKET_WORKER', {
  providedIn: 'root',
  factory: () =>
    new Worker(new URL('./market-generator.worker', import.meta.url), { type: 'module' }),
});

@Injectable({ providedIn: 'root' })
export class MarketGeneratorService {
  private readonly worker = inject(MARKET_WORKER);
  private currentRunId = 0;

  start$(settings: ProducerSettings): Observable<InstrumentMetrics[]> {
    return defer(() => {
      const runId = (this.currentRunId += 1);

      this.worker.postMessage({
        kind: 'start',
        runId,
        seed: Date.now(),
        settings,
        publishIntervalMs: DEFAULT_PUBLISH_INTERVAL_MS,
      } satisfies WorkerRequest);

      return this.watchRun$(runId);
    });
  }

  stop(): void {
    this.worker.postMessage({ kind: 'stop' } satisfies WorkerRequest);
  }

  private watchRun$(runId: number): Observable<InstrumentMetrics[]> {
    return merge(
      fromEvent<MessageEvent<WorkerResponse>>(this.worker, 'message').pipe(
        map((event) => event.data),
        filter((response) => response.runId === runId),
        map((response) =>
          response.kind === 'error' ? failWith(response.detail) : response.metrics,
        ),
      ),
      fromEvent<ErrorEvent>(this.worker, 'error').pipe(
        map((event) => failWith(event.message || 'The generator worker failed to start.')),
      ),
    );
  }
}

function failWith(detail: string): never {
  throw new Error(detail);
}
