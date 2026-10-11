import { MarketGeneratorHandler } from './market-generator.handler';
import type { WorkerRequest } from './market-generator.contract';

const wasmModuleUrl = new URL('market_generator_bg.wasm', self.location.href).href;
const handler = new MarketGeneratorHandler(wasmModuleUrl);

addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  handler.handle(event.data);
});
