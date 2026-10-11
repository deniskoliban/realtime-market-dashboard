import { Observable } from 'rxjs';

import type { InstrumentMetrics, ProducerSettings } from '../../core/market.model';

interface Subscriber {
  next: (metrics: InstrumentMetrics[]) => void;
  error: (cause: unknown) => void;
}

export class MarketGeneratorServiceMock {
  readonly startedWith: ProducerSettings[] = [];
  private readonly subscribers: Subscriber[] = [];

  start$(settings: ProducerSettings): Observable<InstrumentMetrics[]> {
    this.startedWith.push(settings);

    return new Observable<InstrumentMetrics[]>((subscriber) => {
      this.subscribers.push(subscriber);
    });
  }

  runLatest(metrics: InstrumentMetrics[]): void {
    this.subscriberOf(this.subscribers.length - 1).next(metrics);
  }

  failLatest(detail: string): void {
    this.subscriberOf(this.subscribers.length - 1).error(new Error(detail));
  }

  emitTo(subscription: number, metrics: InstrumentMetrics[]): void {
    this.subscriberOf(subscription).next(metrics);
  }

  private subscriberOf(subscription: number): Subscriber {
    const subscriber = this.subscribers[subscription];

    if (subscriber === undefined) {
      throw new Error(`no subscription ${subscription} was started`);
    }

    return subscriber;
  }
}
