use crate::generator::{
    FLOATS_PER_UPDATE, MAX_MID_CENTS, MAX_PRICE_STEP_CENTS, MAX_SPREAD_CENTS, MIN_MID_CENTS,
    MarketGeneratorCore, MarketState,
};

const INSTRUMENT_COUNT: usize = 5;
const SEED: u32 = 20_260_101;
const UPDATES: usize = 200_000;

const INSTRUMENT: usize = 0;
const BID: usize = 1;
const ASK: usize = 2;
const TRADE: usize = 3;
const TRADE_QUANTITY: usize = 4;
const BID_QUANTITY: usize = 5;
const ASK_QUANTITY: usize = 6;

fn batch(count: usize) -> Vec<i64> {
    MarketGeneratorCore::new(INSTRUMENT_COUNT, SEED).next_batch(count)
}

fn update(batch: &[i64], offset: usize) -> MarketState {
    MarketState {
        mid_cents: (batch[offset + BID] + batch[offset + ASK]) / 2,
        bid_cents: batch[offset + BID],
        ask_cents: batch[offset + ASK],
        trade_price_cents: batch[offset + TRADE],
        trade_quantity: batch[offset + TRADE_QUANTITY],
        bid_quantity: batch[offset + BID_QUANTITY],
        ask_quantity: batch[offset + ASK_QUANTITY],
    }
}

fn assert_update_is_well_formed(state: &MarketState, offset: usize) {
    assert!(
        state.bid_cents > 0,
        "update {offset}: bid is {}, expected a positive price",
        state.bid_cents
    );
    assert!(
        state.ask_cents > state.bid_cents,
        "update {offset}: ask {} is not above bid {}",
        state.ask_cents,
        state.bid_cents
    );

    let half_spread = MAX_SPREAD_CENTS / 2;
    let lowest = MIN_MID_CENTS - half_spread;
    let highest = MAX_MID_CENTS + half_spread;
    assert!(
        (lowest..=highest).contains(&state.bid_cents),
        "update {offset}: bid {} is outside {lowest}..={highest}",
        state.bid_cents
    );
    assert!(
        (lowest..=highest).contains(&state.ask_cents),
        "update {offset}: ask {} is outside {lowest}..={highest}",
        state.ask_cents
    );

    let spread = state.ask_cents - state.bid_cents;
    assert!(
        (1..=MAX_SPREAD_CENTS).contains(&spread),
        "update {offset}: spread is {spread}, expected 1..={MAX_SPREAD_CENTS}"
    );
    assert!(
        state.trade_price_cents == state.bid_cents || state.trade_price_cents == state.ask_cents,
        "update {offset}: trade price {} is neither bid {} nor ask {}",
        state.trade_price_cents,
        state.bid_cents,
        state.ask_cents
    );
    assert!(
        state.trade_quantity > 0,
        "update {offset}: trade quantity is {}, expected a positive quantity",
        state.trade_quantity
    );
    assert!(
        state.bid_quantity >= 0,
        "update {offset}: bid quantity is {}, expected 0 or more",
        state.bid_quantity
    );
    assert!(
        state.ask_quantity >= 0,
        "update {offset}: ask quantity is {}, expected 0 or more",
        state.ask_quantity
    );
}

#[test]
fn a_batch_holds_exactly_the_requested_number_of_updates() {
    assert_eq!(batch(0).len(), 0);
    assert_eq!(batch(1).len(), FLOATS_PER_UPDATE);
    assert_eq!(batch(1_000).len(), 1_000 * FLOATS_PER_UPDATE);
}

#[test]
fn every_update_is_a_valid_step_away_from_the_previous_price() {
    let updates = batch(UPDATES);
    let mut last_seen: Vec<Option<MarketState>> = vec![None; INSTRUMENT_COUNT];
    let mut range = [(i64::MAX, i64::MIN); INSTRUMENT_COUNT];

    for offset in (0..updates.len()).step_by(FLOATS_PER_UPDATE) {
        let instrument = updates[offset + INSTRUMENT] as usize;
        let state = update(&updates, offset);

        assert!(
            instrument < INSTRUMENT_COUNT,
            "update {offset} names instrument {instrument}, outside 0..{INSTRUMENT_COUNT}"
        );

        if let Some(previous) = last_seen[instrument] {
            let jump = (state.mid_cents - previous.mid_cents).abs();
            assert!(
                jump <= MAX_SPREAD_CENTS + MAX_PRICE_STEP_CENTS,
                "instrument {instrument} jumped {jump} cents, from {} to {}",
                previous.mid_cents,
                state.mid_cents
            );
        }

        assert_update_is_well_formed(&state, offset);

        let (low, high) = range[instrument];
        range[instrument] = (low.min(state.mid_cents), high.max(state.mid_cents));
        last_seen[instrument] = Some(state);
    }

    for (instrument, (low, high)) in range.iter().enumerate() {
        assert!(
            high - low > 100,
            "instrument {instrument} only ever quoted {low}..{high}, so its price never moved"
        );
    }
}
