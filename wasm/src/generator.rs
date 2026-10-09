pub(crate) const FLOATS_PER_UPDATE: usize = 7;

pub(crate) const MIN_MID_CENTS: i64 = 200;
pub(crate) const MAX_MID_CENTS: i64 = 50_000;
pub(crate) const MAX_SPREAD_CENTS: i64 = 8;

const START_MID_CENTS: i64 = 1_000;
const MAX_TRADE_QUANTITY: i64 = 500;
const MAX_BOOK_QUANTITY: i64 = 2_000;
const MIN_PRICE_STEP_CENTS: i64 = -32;
pub(crate) const MAX_PRICE_STEP_CENTS: i64 = 32;

#[derive(Copy, Clone, Debug, Default, PartialEq)]
pub(crate) struct MarketState {
    pub(crate) mid_cents: i64,
    pub(crate) bid_cents: i64,
    pub(crate) ask_cents: i64,
    pub(crate) trade_price_cents: i64,
    pub(crate) trade_quantity: i64,
    pub(crate) bid_quantity: i64,
    pub(crate) ask_quantity: i64,
}

pub(crate) struct MarketGeneratorCore {
    rng: fastrand::Rng,
    states: Vec<MarketState>,
}

impl MarketGeneratorCore {
    pub(crate) fn new(instrument_count: usize, seed: u32) -> Self {
        assert!(instrument_count > 0, "instrument_count must be positive");
        let mut rng = fastrand::Rng::with_seed(seed as u64);
        let states = (0..instrument_count)
            .map(|_| seed_state(&mut rng))
            .collect();

        Self { rng, states }
    }

    pub(crate) fn next_batch(&mut self, count: usize) -> Vec<i64> {
        let mut batch = Vec::with_capacity(count * FLOATS_PER_UPDATE);
        for _ in 0..count {
            let index = self.rng.usize(0..self.states.len());
            self.states[index] = advance(&mut self.rng, self.states[index]);
            pack_into(&mut batch, index, &self.states[index]);
        }
        batch
    }
}

fn seed_state(rng: &mut fastrand::Rng) -> MarketState {
    MarketState {
        mid_cents: rng.i64(START_MID_CENTS..MAX_MID_CENTS),
        bid_quantity: rng.i64(0..MAX_BOOK_QUANTITY),
        ask_quantity: rng.i64(0..MAX_BOOK_QUANTITY),
        ..Default::default()
    }
}

fn advance(rng: &mut fastrand::Rng, mut state: MarketState) -> MarketState {
    let price_step = rng.i64(MIN_PRICE_STEP_CENTS..MAX_PRICE_STEP_CENTS);
    state.mid_cents = (state.mid_cents + price_step).clamp(MIN_MID_CENTS, MAX_MID_CENTS);
    state.bid_quantity = rng.i64(0..MAX_BOOK_QUANTITY);
    state.ask_quantity = rng.i64(0..MAX_BOOK_QUANTITY);

    let spread = rng.i64(1..=MAX_SPREAD_CENTS);
    state.bid_cents = state.mid_cents - spread / 2;
    state.ask_cents = state.bid_cents + spread;
    state.trade_price_cents = if rng.bool() {
        state.ask_cents
    } else {
        state.bid_cents
    };
    state.trade_quantity = rng.i64(1..=MAX_TRADE_QUANTITY);

    state
}

fn pack_into(buffer: &mut Vec<i64>, instrument_index: usize, state: &MarketState) {
    buffer.push(instrument_index as i64);
    buffer.push(state.bid_cents);
    buffer.push(state.ask_cents);
    buffer.push(state.trade_price_cents);
    buffer.push(state.trade_quantity);
    buffer.push(state.bid_quantity);
    buffer.push(state.ask_quantity);
}
