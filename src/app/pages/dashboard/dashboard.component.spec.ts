import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard.component';
import { MarketRunService } from '../../services/market-run-service/market-run.service';

import type { InstrumentMetrics, ProducerSettings } from '../../services/market.model';

class MarketRunServiceMock {
  readonly metrics = signal<InstrumentMetrics[]>([]);
  readonly failure = signal<string | null>(null);
  readonly paused = signal(false);

  start(_settings: ProducerSettings): void {}

  pause(): void {
    this.paused.set(true);
  }

  resume(): void {
    this.paused.set(false);
  }
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let marketRunService: MarketRunServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{ provide: MarketRunService, useValue: new MarketRunServiceMock() }],
    }).compileComponents();

    marketRunService = TestBed.inject(MarketRunService);
    fixture = TestBed.createComponent(Dashboard);
  });

  function renderedText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function renderedCells(): string[][] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map(
      (row) => Array.from(row.children).map((cell) => (cell.textContent ?? '').trim()),
    );
  }

  it('renders the table from the service and shows the failure it reports', async () => {
    marketRunService.metrics.set([
      {
        instrument: 'ALFA',
        lastTradeCents: 10200,
        spreadCents: 4,
        volume: 40,
        vwapCents: 10150,
        imbalance: 0.2,
      },
      {
        instrument: 'BETA',
        lastTradeCents: null,
        spreadCents: null,
        volume: 0,
        vwapCents: null,
        imbalance: null,
      },
    ]);

    await fixture.whenStable();

    const rows = renderedCells();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['ALFA', '$102.00', '$0.04', '40', '$101.50', '0.20']);
    expect(rows[1]).toEqual(['BETA', '—', '—', '0', '—', '—']);

    marketRunService.failure.set('the generator module is missing');

    await fixture.whenStable();

    const text = renderedText();
    expect(text).toContain('The run stopped after an error.');
    expect(text).toContain('the generator module is missing');
  });
});
