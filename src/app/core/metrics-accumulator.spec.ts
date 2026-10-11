import { MetricsAccumulator } from './metrics-accumulator';
import type { InstrumentMetrics } from '../services/market-worker-protocol';

function update(
  instrument: number,
  bidCents: number,
  askCents: number,
  tradePriceCents: number,
  tradeQuantity: number,
  bidQuantity: number,
  askQuantity: number,
): number[] {
  return [instrument, bidCents, askCents, tradePriceCents, tradeQuantity, bidQuantity, askQuantity];
}

function batch(...updates: number[][]): Float64Array {
  return Float64Array.from(updates.flat());
}

function unavailable(instrument: string): InstrumentMetrics {
  return {
    instrument,
    lastTradeCents: null,
    spreadCents: null,
    volume: 0,
    vwapCents: null,
    imbalance: null,
  };
}

describe('MetricsAccumulator', () => {
  it('reports unavailable values until an instrument trades, and leaves the other alone', () => {
    const accumulator = new MetricsAccumulator(['ALFA', 'BETA']);

    expect(accumulator.metrics()).toEqual([unavailable('ALFA'), unavailable('BETA')]);

    accumulator.add(batch(update(0, 100, 102, 101, 0, 0, 0)));

    expect(accumulator.metrics()).toEqual([
      {
        instrument: 'ALFA',
        lastTradeCents: 101,
        spreadCents: 2,
        volume: 0,
        vwapCents: null,
        imbalance: null,
      },
      unavailable('BETA'),
    ]);
  });

  it('counts every trade of the assignment example, inside a batch and across batches', () => {
    const accumulator = new MetricsAccumulator(['ALFA']);

    accumulator.add(
      batch(
        update(0, 9996, 10000, 10000, 10, 500, 500),
        update(0, 9996, 10000, 10000, 20, 500, 500),
      ),
    );

    expect(accumulator.metrics()[0]).toMatchObject({ volume: 30, vwapCents: 10000 });
    expect(accumulator.metrics()[0].imbalance).toBe(0);

    accumulator.add(batch(update(0, 10196, 10200, 10200, 30, 600, 400)));

    expect(accumulator.metrics()[0]).toEqual({
      instrument: 'ALFA',
      lastTradeCents: 10200,
      spreadCents: 4,
      volume: 60,
      vwapCents: 10100,
      imbalance: 0.2,
    });
  });
});
