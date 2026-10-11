import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { MarketGeneratorService } from '../../services/market-generator';
import { DEFAULT_PRODUCER_SETTINGS } from '../../services/market-worker-protocol';
import type { InstrumentMetrics } from '../../services/market-worker-protocol';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DecimalPipe],
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly generator = inject(MarketGeneratorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly run = signal<Subscription | null>(null);

  readonly intervalMs = DEFAULT_PRODUCER_SETTINGS.batchIntervalMs;
  readonly updatesPerBatch = DEFAULT_PRODUCER_SETTINGS.updatesPerBatch;
  readonly metrics = signal<InstrumentMetrics[]>([]);
  readonly snapshots = signal(0);
  readonly failure = signal<string | null>(null);
  readonly status = computed(() => {
    if (this.failure() !== null) {
      return 'failed';
    }

    return this.run() === null ? 'idle' : 'running';
  });

  start(): void {
    this.run()?.unsubscribe();
    this.failure.set(null);
    this.snapshots.set(0);
    this.metrics.set([]);

    this.run.set(
      this.generator
        .start$(DEFAULT_PRODUCER_SETTINGS)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (metrics) => this.receive(metrics),
          error: (cause) => this.fail(cause),
        }),
    );
  }

  stop(): void {
    this.run()?.unsubscribe();
    this.run.set(null);
    this.generator.stop();
  }

  private receive(metrics: InstrumentMetrics[]): void {
    this.snapshots.update((count) => count + 1);
    this.metrics.set(metrics);
  }

  private fail(cause: unknown): void {
    this.failure.set(cause instanceof Error ? cause.message : String(cause));
  }
}
