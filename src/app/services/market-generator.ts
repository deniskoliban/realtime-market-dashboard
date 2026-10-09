import { InjectionToken } from '@angular/core';

import init, { MarketGenerator } from '@wasm/market_generator.js';

export interface MarketUpdate {
  instrument: string;
  bidCents: number;
  askCents: number;
  tradePriceCents: number;
  tradeQuantity: number;
  bidQuantity: number;
  askQuantity: number;
}

export type GeneratorLoader = () => Promise<unknown>;

export const GENERATOR_LOADER = new InjectionToken<GeneratorLoader>('GENERATOR_LOADER', {
  providedIn: 'root',
  factory: () => async () => {
    const response = await fetch(new URL('market_generator_bg.wasm', document.baseURI));
    return init({ module_or_path: response });
  },
});

export const INSTRUMENTS = ['ALFA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON'];

export class MarketGeneratorService {
  private generator: MarketGenerator | null = null;

  async load(loader: GeneratorLoader, seed: number): Promise<void> {
    await loader();
    this.generator = new MarketGenerator(INSTRUMENTS.length, seed);
  }

  nextBatch(count: number): MarketUpdate[] {
    if (this.generator === null) {
      throw new Error('the generator is not loaded');
    }

    const batch = this.generator.nextBatch(count);
    const updates: MarketUpdate[] = [];
    for (let offset = 0; offset < batch.length; offset += 7) {
      updates.push({
        instrument: INSTRUMENTS[batch[offset]],
        bidCents: batch[offset + 1],
        askCents: batch[offset + 2],
        tradePriceCents: batch[offset + 3],
        tradeQuantity: batch[offset + 4],
        bidQuantity: batch[offset + 5],
        askQuantity: batch[offset + 6],
      });
    }
    return updates;
  }
}
