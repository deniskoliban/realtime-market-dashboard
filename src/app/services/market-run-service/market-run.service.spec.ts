import { TestBed } from '@angular/core/testing';

import { MarketRunService } from './market-run.service';
import { MarketGeneratorService } from '../market-generator-service/market-generator.service';
import { MarketGeneratorServiceMock } from '../market-generator-service/market-generator.service.mock';
import { DEFAULT_PRODUCER_SETTINGS } from '../../core/market.model';

import type { InstrumentMetrics, ProducerSettings } from '../../core/market.model';

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

describe('MarketRunService', () => {
  let generatorMock: MarketGeneratorServiceMock;
  let service: MarketRunService;

  beforeEach(() => {
    generatorMock = new MarketGeneratorServiceMock();

    TestBed.configureTestingModule({
      providers: [{ provide: MarketGeneratorService, useValue: generatorMock }],
    });

    service = TestBed.inject(MarketRunService);
  });

  it('starts the producer with the applied settings, from an empty state', () => {
    service.start(settings);

    expect(generatorMock.startedWith).toEqual([settings]);
    expect(service.metrics()).toEqual([]);
    expect(service.failure()).toBeNull();
  });

  it('takes the newest snapshot, and clears everything when a new run replaces it', () => {
    service.start(settings);

    generatorMock.runLatest(metrics);
    generatorMock.runLatest(otherMetrics);

    expect(service.metrics()).toEqual(otherMetrics);

    service.start(otherSettings);

    expect(service.metrics()).toEqual([]);
    expect(service.failure()).toBeNull();
  });

  it('reports the failure the producer sent and keeps the last metrics', () => {
    service.start(settings);

    generatorMock.runLatest(metrics);
    generatorMock.failLatest('the generator module is missing');

    expect(service.failure()).toBe('the generator module is missing');
    expect(service.metrics()).toEqual(metrics);
  });

  it('ignores the results of the run it has replaced', () => {
    service.start(settings);
    service.start(otherSettings);

    generatorMock.emitTo(0, metrics);

    expect(service.metrics()).toEqual([]);
  });
});
