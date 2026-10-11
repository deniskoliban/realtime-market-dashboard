import { signal } from '@angular/core';

import type { InstrumentMetrics, ProducerSettings } from '../../core/market.model';

export class MarketRunServiceMock {
  readonly settings = signal<ProducerSettings | null>(null);
  readonly metrics = signal<InstrumentMetrics[]>([]);
  readonly failure = signal<string | null>(null);

  start(_settings: ProducerSettings): void {}
}
