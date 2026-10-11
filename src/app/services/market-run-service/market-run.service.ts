import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { MarketGeneratorService } from '../market-generator-service/market-generator.service';

import type { InstrumentMetrics, ProducerSettings } from '../market.model';

@Injectable({ providedIn: 'root' })
export class MarketRunService {
  private readonly generator = inject(MarketGeneratorService);
  private readonly destroyRef = inject(DestroyRef);
  private run: Subscription | null = null;

  readonly metrics = signal<InstrumentMetrics[]>([]);
  readonly failure = signal<string | null>(null);
  readonly paused = signal(false);

  start(settings: ProducerSettings): void {
    this.run?.unsubscribe();
    this.failure.set(null);
    this.metrics.set([]);
    this.paused.set(false);

    this.run = this.generator
      .start$(settings)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (metrics) => this.receive(metrics),
        error: (cause) => this.fail(cause),
      });
  }

  pause(): void {
    this.paused.set(true);
    this.generator.pause();
  }

  resume(): void {
    this.paused.set(false);
    this.generator.resume();
  }

  private receive(metrics: InstrumentMetrics[]): void {
    this.metrics.set(metrics);
  }

  private fail(cause: unknown): void {
    this.failure.set(cause instanceof Error ? cause.message : String(cause));
  }
}
