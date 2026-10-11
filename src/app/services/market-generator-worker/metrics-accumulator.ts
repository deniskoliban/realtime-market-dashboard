import type { InstrumentMetrics } from '../market.model';
import { UpdateField, FLOATS_PER_UPDATE } from '../batch-layout.contract';

interface Aggregate {
  volume: number;
  notionalCents: number;
  lastTradeCents: number | null;
  bidCents: number | null;
  askCents: number | null;
  bidQuantity: number | null;
  askQuantity: number | null;
}

export class MetricsAccumulator {
  private readonly instrumentNames: string[];
  private readonly aggregates: Aggregate[];

  constructor(instrumentNames: string[]) {
    this.instrumentNames = instrumentNames;
    this.aggregates = instrumentNames.map(() => ({
      volume: 0,
      notionalCents: 0,
      lastTradeCents: null,
      bidCents: null,
      askCents: null,
      bidQuantity: null,
      askQuantity: null,
    }));
  }

  add(batch: Float64Array): void {
    for (let offset = 0; offset < batch.length; offset += FLOATS_PER_UPDATE) {
      const aggregate = this.aggregates[batch[offset + UpdateField.Instrument]];

      if (!aggregate) {
        throw new Error(`no aggregate for instrument ${batch[offset + UpdateField.Instrument]}`);
      }

      aggregate.volume += batch[offset + UpdateField.TradeQuantity];
      aggregate.notionalCents +=
        batch[offset + UpdateField.TradePrice] * batch[offset + UpdateField.TradeQuantity];
      aggregate.lastTradeCents = batch[offset + UpdateField.TradePrice];
      aggregate.bidCents = batch[offset + UpdateField.Bid];
      aggregate.askCents = batch[offset + UpdateField.Ask];
      aggregate.bidQuantity = batch[offset + UpdateField.BidQuantity];
      aggregate.askQuantity = batch[offset + UpdateField.AskQuantity];
    }
  }

  metrics(): InstrumentMetrics[] {
    return this.aggregates.map((aggregate, index) => ({
      instrument: this.instrumentNames[index],
      lastTradeCents: aggregate.lastTradeCents,
      spreadCents: spreadCentsOf(aggregate),
      volume: aggregate.volume,
      vwapCents: vwapCentsOf(aggregate),
      imbalance: imbalanceOf(aggregate),
    }));
  }
}

function spreadCentsOf(aggregate: Aggregate): number | null {
  if (aggregate.bidCents === null || aggregate.askCents === null) {
    return null;
  }

  return aggregate.askCents - aggregate.bidCents;
}

function vwapCentsOf(aggregate: Aggregate): number | null {
  if (aggregate.volume === 0) {
    return null;
  }

  return aggregate.notionalCents / aggregate.volume;
}

function imbalanceOf(aggregate: Aggregate): number | null {
  if (aggregate.bidQuantity === null || aggregate.askQuantity === null) {
    return null;
  }

  const totalQuantity = aggregate.bidQuantity + aggregate.askQuantity;

  if (totalQuantity === 0) {
    return null;
  }

  return (aggregate.bidQuantity - aggregate.askQuantity) / totalQuantity;
}
