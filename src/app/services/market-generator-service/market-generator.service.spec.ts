import { TestBed } from '@angular/core/testing';

import { MARKET_GENERATOR_WORKER, MarketGeneratorService } from './market-generator.service';
import { DEFAULT_PUBLISH_INTERVAL_MS } from '../market-generator-worker/market-generator.contract';

import type { InstrumentMetrics, ProducerSettings } from '../market.model';
import type {
  WorkerRequest,
  WorkerResponse,
} from '../market-generator-worker/market-generator.contract';

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

interface WorkerDouble {
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: (type: string, listener: unknown) => void;
  removeEventListener: (type: string, listener: unknown) => void;
  respond: (response: WorkerResponse) => void;
  respondError: (message: string) => void;
}

function workerDouble(): WorkerDouble {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const dispatch = (type: string, event: unknown): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener(event);
    }
  };

  return {
    postMessage: vi.fn<(request: WorkerRequest) => void>(),
    respond: (response) => dispatch('message', { data: response }),
    respondError: (message) => dispatch('error', { message }),
    addEventListener: (type: string, listener: unknown) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener as (event: unknown) => void]);
    },
    removeEventListener: (type: string, listener: unknown) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((entry) => entry !== listener),
      );
    },
  };
}

describe('MarketGeneratorService', () => {
  let worker: WorkerDouble;
  let service: MarketGeneratorService;

  beforeEach(() => {
    worker = workerDouble();

    TestBed.configureTestingModule({
      providers: [{ provide: MARKET_GENERATOR_WORKER, useValue: worker }],
    });

    service = TestBed.inject(MarketGeneratorService);
  });

  it('posts start with the settings, and the pause state on request', () => {
    service.start$(settings).subscribe();

    expect(worker.postMessage).toHaveBeenNthCalledWith(1, {
      kind: 'start',
      runId: 1,
      seed: expect.any(Number),
      settings,
      publishIntervalMs: DEFAULT_PUBLISH_INTERVAL_MS,
    });

    service.pause();
    service.resume();

    expect(worker.postMessage).toHaveBeenNthCalledWith(2, { kind: 'pause', paused: true });
    expect(worker.postMessage).toHaveBeenNthCalledWith(3, { kind: 'pause', paused: false });
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

  it('reports the failure the worker sent', () => {
    const failures: string[] = [];
    service.start$(settings).subscribe({ error: (cause) => failures.push(cause.message) });

    worker.respond({ kind: 'error', runId: 1, detail: 'the generator module is missing' });

    expect(failures).toEqual(['the generator module is missing']);
  });

  it('reports a failure the worker script raised', () => {
    const failures: string[] = [];
    service.start$(settings).subscribe({ error: (cause) => failures.push(cause.message) });

    worker.respondError('the generator worker script could not be loaded');

    expect(failures).toEqual(['the generator worker script could not be loaded']);
  });

  it('reports a named failure when the worker script raised none', () => {
    const failures: string[] = [];
    service.start$(settings).subscribe({ error: (cause) => failures.push(cause.message) });

    worker.respondError('');

    expect(failures).toEqual(['The generator worker failed to start.']);
  });
});
