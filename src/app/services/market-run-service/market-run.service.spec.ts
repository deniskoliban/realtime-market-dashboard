import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { MarketRunService } from './market-run.service';
import { MarketGeneratorService } from '../market-generator-service/market-generator.service';
import { DEFAULT_PRODUCER_SETTINGS } from '../market.model';

import type { Observer } from 'rxjs';
import type { InstrumentMetrics, ProducerSettings } from '../market.model';

class MarketGeneratorServiceMock {
  readonly startedWith: ProducerSettings[] = [];
  private latest: Observer<InstrumentMetrics[]> | null = null;

  get subscriber(): Observer<InstrumentMetrics[]> {
    if (this.latest === null) {
      throw new Error('the producer was not started');
    }

    return this.latest;
  }

  start$(settings: ProducerSettings): Observable<InstrumentMetrics[]> {
    this.startedWith.push(settings);

    return new Observable<InstrumentMetrics[]>((subscriber) => {
      this.latest = subscriber;
    });
  }

  pause(): void {}

  resume(): void {}
}

const settings: ProducerSettings = DEFAULT_PRODUCER_SETTINGS;

const otherSettings: ProducerSettings = {
  instrumentCount: 2,
  updatesPerBatch: 10,
  batchIntervalMs: 100,
};

const metrics: InstrumentMetrics[] = [
  {
    instrument: 'ALFA',
    lastTradeCents: 10200,
    spreadCents: 4,
    volume: 40,
    vwapCents: 10150,
    imbalance: 0.2,
  },
];

describe('MarketRunService', () => {
  let service: MarketRunService;
  let generator: MarketGeneratorServiceMock;

  beforeEach(() => {
    generator = new MarketGeneratorServiceMock();

    TestBed.configureTestingModule({
      providers: [{ provide: MarketGeneratorService, useValue: generator }],
    });

    service = TestBed.inject(MarketRunService);
  });

  it('starts the producer with the applied settings, and takes what it published', () => {
    service.start(settings);

    generator.subscriber.next(metrics);

    expect(generator.startedWith).toEqual([settings]);
    expect(service.metrics()).toEqual(metrics);
  });

  it('reports the failure the producer sent', () => {
    service.start(settings);

    generator.subscriber.error(new Error('the generator module is missing'));

    expect(service.failure()).toBe('the generator module is missing');
  });

  it('clears the failure and the values of the run it replaces', () => {
    service.start(settings);
    generator.subscriber.next(metrics);
    generator.subscriber.error(new Error('the generator module is missing'));

    service.start(otherSettings);

    const rows = service.metrics();
    expect(rows).toHaveLength(otherSettings.instrumentCount);
    expect(rows.every((row) => row.volume === 0 && row.lastTradeCents === null)).toBe(true);
    expect(service.failure()).toBeNull();
  });

  it('ignores the results of the run it has replaced', () => {
    service.start(settings);

    const replaced = generator.subscriber;

    service.start(otherSettings);
    replaced.next(metrics);

    const rows = service.metrics();
    expect(rows.every((row) => row.volume === 0)).toBe(true);
    expect(rows).not.toEqual(metrics);
  });

  it('holds the settings of the run in progress', () => {
    service.start(settings);

    expect(service.settings()).toEqual(settings);

    service.start(otherSettings);

    expect(service.settings()).toEqual(otherSettings);
  });

  it('starts the run that replaces it unpaused', () => {
    service.start(settings);

    service.pause();
    service.start(otherSettings);

    expect(service.paused()).toBe(false);
  });

  it('reports the run as paused, and as running again after resume', () => {
    service.start(settings);

    service.pause();

    expect(service.paused()).toBe(true);

    service.resume();

    expect(service.paused()).toBe(false);
  });
});
