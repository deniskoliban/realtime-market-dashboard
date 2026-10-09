import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

import {
  GENERATOR_LOADER,
  MarketGeneratorService,
  MarketUpdate,
} from '../../services/market-generator';

const BATCH_SIZE = 30;
const SEED = 42;

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe],
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly generator = new MarketGeneratorService();
  private readonly loadGenerator = inject(GENERATOR_LOADER);

  readonly batchSize: number = BATCH_SIZE;
  readonly updates = signal<MarketUpdate[]>([]);
  readonly error = signal<string | null>(null);
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    this.error.set(null);
    try {
      await this.generator.load(this.loadGenerator, SEED);
    } catch (cause) {
      this.error.set(`the generator did not load: ${String(cause)}`);
    }
  }

  nextBatch(): void {
    this.error.set(null);
    try {
      this.updates.set(this.generator.nextBatch(BATCH_SIZE));
    } catch (cause) {
      this.error.set(`generation failed: ${String(cause)}`);
    }
  }
}
