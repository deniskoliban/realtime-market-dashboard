import { MetricsAccumulator } from './metrics-accumulator';
import type { InstrumentMetrics } from '../market.model';

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
  it('reports unavailable values and zero volume before an instrument trades', () => {
    const accumulator = new MetricsAccumulator(['ALFA', 'BETA']);

    expect(accumulator.metrics()).toEqual([unavailable('ALFA'), unavailable('BETA')]);
  });

  it('counts the trades of the worked example', () => {
    const accumulator = new MetricsAccumulator(['ALFA']);

    accumulator.add(
      batch(
        update(0, 9996, 10000, 10000, 10, 600, 400),
        update(0, 10196, 10200, 10200, 30, 600, 400),
      ),
    );

    expect(accumulator.metrics()[0]).toEqual({
      instrument: 'ALFA',
      lastTradeCents: 10200,
      spreadCents: 4,
      volume: 40,
      vwapCents: 10150,
      imbalance: 0.2,
    });
  });

  it('counts a trade exactly once when the instrument appears twice in a batch', () => {
    const accumulator = new MetricsAccumulator(['ALFA']);

    accumulator.add(
      batch(
        update(0, 9996, 10000, 10000, 10, 500, 500),
        update(0, 9996, 10000, 10000, 20, 500, 500),
      ),
    );

    expect(accumulator.metrics()[0].volume).toBe(30);
  });

  it('keeps the totals of the other instruments', () => {
    const accumulator = new MetricsAccumulator(['ALFA', 'BETA']);

    accumulator.add(batch(update(0, 10196, 10200, 10200, 30, 600, 400)));

    expect(accumulator.metrics()[1]).toEqual(unavailable('BETA'));
  });

  it('reports no imbalance when both book quantities are zero', () => {
    const accumulator = new MetricsAccumulator(['ALFA']);

    accumulator.add(batch(update(0, 9996, 10000, 10000, 10, 0, 0)));

    expect(accumulator.metrics()[0]).toMatchObject({ volume: 10, imbalance: null });
  });

  it('continues the totals across batches', () => {
    const accumulator = new MetricsAccumulator(['ALFA']);

    accumulator.add(batch(update(0, 9996, 10000, 10000, 10, 500, 500)));
    accumulator.add(batch(update(0, 10196, 10200, 10200, 30, 600, 400)));

    expect(accumulator.metrics()[0]).toMatchObject({ volume: 40, lastTradeCents: 10200 });
  });
});
