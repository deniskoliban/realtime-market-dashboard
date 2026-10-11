import { TestBed } from '@angular/core/testing';

import { MARKET_WORKER, MarketGeneratorService } from './market-generator.service';
import { WorkerMock } from '../market-generator-worker/market-generator.worker.mock';
import { DEFAULT_PUBLISH_INTERVAL_MS } from '../market-generator-worker/market-generator.worker.contract';
import type { InstrumentMetrics, ProducerSettings } from '../../core/market.model';

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
  let worker: WorkerMock;
  let service: MarketGeneratorService;

  beforeEach(() => {
    worker = new WorkerMock();

    TestBed.configureTestingModule({
      providers: [{ provide: MARKET_WORKER, useValue: worker }],
    });

    service = TestBed.inject(MarketGeneratorService);
  });

  it('posts start with the settings, and stop on request', () => {
    service.start$(settings).subscribe();

    expect(worker.sent[0]).toMatchObject({
      kind: 'start',
      settings,
      publishIntervalMs: DEFAULT_PUBLISH_INTERVAL_MS,
    });

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
