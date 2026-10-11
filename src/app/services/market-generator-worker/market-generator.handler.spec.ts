import { MarketGeneratorHandler } from './market-generator.handler';
import type { SnapshotResponse, StartRequest, WorkerRequest } from './market-generator.contract';
import type { WorkerResponse } from './market-generator.contract';

const startRequest: StartRequest = {
  kind: 'start',
  runId: 1,
  seed: 7,
  settings: {
    instrumentCount: 1,
    updatesPerBatch: 5,
    batchIntervalMs: 40,
  },
  publishIntervalMs: 50,
};

const publishIntervalMs = startRequest.publishIntervalMs;
const volumePerBatch = startRequest.settings.updatesPerBatch * 10;
const firstBatch = volumePerBatch;
const secondBatch = 2 * volumePerBatch;

function isSnapshot(message: unknown): message is SnapshotResponse {
  return (message as SnapshotResponse).kind === 'snapshot';
}

describe('MarketGeneratorHandler', () => {
  let handler: MarketGeneratorHandler;
  let sent: WorkerResponse[];

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    vi.stubGlobal('postMessage', (response: WorkerResponse) => sent.push(response));
    handler = new MarketGeneratorHandler('http://localhost/market_generator_bg.wasm');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function send(request: WorkerRequest): void {
    handler.handle(request);
  }

  function volumes(): number[] {
    return sent.filter(isSnapshot).map((snapshot) => snapshot.metrics[0].volume);
  }

  it('publishes the totals until a new run replaces it, and starts that run unpaused', async () => {
    send(startRequest);

    await vi.advanceTimersByTimeAsync(2 * publishIntervalMs);

    expect(volumes()).toEqual([firstBatch, secondBatch]);

    send({ kind: 'pause', paused: true });
    send(startRequest);

    await vi.advanceTimersByTimeAsync(publishIntervalMs);

    expect(volumes()).toEqual([firstBatch, secondBatch, firstBatch]);
  });

  it('freezes the totals and stays silent while paused, then continues from them', async () => {
    send(startRequest);

    await vi.advanceTimersByTimeAsync(publishIntervalMs);

    expect(volumes()).toEqual([firstBatch]);

    send({ kind: 'pause', paused: true });

    await vi.advanceTimersByTimeAsync(4 * publishIntervalMs);

    expect(volumes()).toEqual([firstBatch]);

    send({ kind: 'pause', paused: false });

    await vi.advanceTimersByTimeAsync(publishIntervalMs);

    expect(volumes()).toEqual([firstBatch, secondBatch]);
  });
});
