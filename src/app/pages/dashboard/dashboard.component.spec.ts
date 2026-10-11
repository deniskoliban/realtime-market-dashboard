import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable } from 'rxjs';

import { Dashboard } from './dashboard.component';
import { MarketGeneratorService } from '../../services/market-generator.service';
import { DEFAULT_PRODUCER_SETTINGS } from '../../services/market-worker-protocol.contract';
import type {
  InstrumentMetrics,
  ProducerSettings,
} from '../../services/market-worker-protocol.contract';

class MockGenerator {
  readonly startedWith: ProducerSettings[] = [];
  stops = 0;

  start$(settings: ProducerSettings): Observable<InstrumentMetrics[]> {
    this.startedWith.push(settings);

    return NEVER;
  }

  stop(): void {
    this.stops += 1;
  }
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let generator: MockGenerator;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [MockGenerator, { provide: MarketGeneratorService, useExisting: MockGenerator }],
    }).compileComponents();

    generator = TestBed.inject(MockGenerator);
    fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
  });

  it('starts the run with the default settings', () => {
    fixture.componentInstance.start();

    expect(generator.startedWith).toEqual([DEFAULT_PRODUCER_SETTINGS]);
  });

  it('stops the run', () => {
    fixture.componentInstance.stop();

    expect(generator.stops).toBe(1);
  });
});
