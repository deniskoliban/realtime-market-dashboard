mod generator;

use wasm_bindgen::prelude::*;

use generator::MarketGeneratorCore;

#[wasm_bindgen]
pub struct MarketGenerator {
    core: MarketGeneratorCore,
}

#[wasm_bindgen]
impl MarketGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(instrument_count: usize, seed: u32) -> Self {
        Self {
            core: MarketGeneratorCore::new(instrument_count, seed),
        }
    }

    #[wasm_bindgen(js_name = nextBatch)]
    pub fn next_batch(&mut self, count: usize) -> Vec<f64> {
        self.core
            .next_batch(count)
            .into_iter()
            .map(|cents| cents as f64)
            .collect()
    }
}

#[cfg(test)]
mod tests;
