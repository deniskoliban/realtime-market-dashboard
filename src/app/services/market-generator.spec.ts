import { TestBed } from '@angular/core/testing';

import { MARKET_WORKER, MarketGeneratorService } from './market-generator';
import { DEFAULT_PUBLISH_INTERVAL_MS } from './market-worker-protocol';
import type {
  InstrumentMetrics,
  ProducerSettings,
  WorkerRequest,
  WorkerResponse,
} from './market-worker-protocol';

class MockWorker {
  readonly sent: WorkerRequest[] = [];
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  addEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener as (event: unknown) => void);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((entry) => (entry as unknown) !== (listener as unknown)),
    );
  }

  postMessage(request: WorkerRequest): void {
    this.sent.push(request);
  }

  respond(response: WorkerResponse): void {
    this.dispatch('message', { data: response });
  }

  fail(message: string): void {
    this.dispatch('error', { message });
  }

  private dispatch(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const settings: ProducerSettings = {
  instrumentCount: 2,
  updatesPerBatch: 5,
  batchIntervalMs: 100,
};

const metrics: InstrumentMetrics[] = [
  {
    instrument: 'ALFA',
    lastTradeCents: 10000,
    spreadCents: 2,
    volume: 10,
    vwapCents: 10000,
    imbalance: 0,
  },
];

const otherMetrics: InstrumentMetrics[] = [
  {
    instrument: 'BETA',
    lastTradeCents: 20000,
    spreadCents: 4,
    volume: 20,
    vwapCents: 20000,
    imbalance: 0.1,
  },
];

describe('MarketGeneratorService', () => {
  let worker: MockWorker;
  let service: MarketGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockWorker, { provide: MARKET_WORKER, useExisting: MockWorker }],
    });
    worker = TestBed.inject(MockWorker);
    service = TestBed.inject(MarketGeneratorService);
  });

  it('posts start with the settings, and stop on request', () => {
    service.start$(settings).subscribe();

    expect(worker.sent[0]).toMatchObject({ kind: 'start', settings, publishIntervalMs: DEFAULT_PUBLISH_INTERVAL_MS });

    service.stop();

    expect(worker.sent[1]).toEqual({ kind: 'stop' });
  });

  it('delivers each snapshot only to the run that is still listening', () => {
    const first: InstrumentMetrics[][] = [];
    const second: InstrumentMetrics[][] = [];

    const firstRun = service.start$(settings).subscribe((snapshot) => first.push(snapshot));
    service.start$(settings).subscribe((snapshot) => second.push(snapshot));

    firstRun.unsubscribe();

    worker.respond({ kind: 'snapshot', runId: 1, metrics });
    worker.respond({ kind: 'snapshot', runId: 2, metrics: otherMetrics });

    expect(first).toEqual([]);
    expect(second).toEqual([otherMetrics]);
  });

  it('reports every failure through the same channel', () => {
    const failures: string[] = [];
    const received: InstrumentMetrics[][] = [];

    service.start$(settings).subscribe({
      next: (snapshot) => received.push(snapshot),
      error: (cause) => failures.push(cause.message),
    });
    worker.respond({ kind: 'error', runId: 1, detail: 'the generator module is missing' });

    service.start$(settings).subscribe({ error: (cause) => failures.push(cause.message) });
    worker.fail('the generator worker script could not be loaded');

    service.start$(settings).subscribe({ error: (cause) => failures.push(cause.message) });
    worker.fail('');

    worker.respond({ kind: 'snapshot', runId: 1, metrics });

    expect(failures).toEqual([
      'the generator module is missing',
      'the generator worker script could not be loaded',
      'The generator worker failed to start.',
    ]);
    expect(received).toEqual([]);
  });
});
