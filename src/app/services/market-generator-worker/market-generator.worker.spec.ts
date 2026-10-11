import type { ProducerSettings } from '../../core/market.model';
import type { SnapshotResponse, WorkerResponse } from './market-generator.worker.contract';

const startSettings: ProducerSettings = {
  instrumentCount: 1,
  updatesPerBatch: 5,
  batchIntervalMs: 40,
};

const publishIntervalMs = 50;

let posted: WorkerResponse[] = [];
let onMessage: ((event: never) => void) | null = null;

function start(): void {
  onMessage?.({
    data: { kind: 'start', runId: 1, seed: 7, settings: startSettings, publishIntervalMs },
  } as never);
}

function stop(): void {
  onMessage?.({ data: { kind: 'stop' } } as never);
}

function volumes(): number[] {
  return posted
    .filter((response): response is SnapshotResponse => response.kind === 'snapshot')
    .map((response) => response.metrics[0].volume);
}

describe('market generator worker', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    posted = [];
    onMessage = null;

    vi.stubGlobal('addEventListener', (type: string, listener: (event: never) => void) => {
      if (type === 'message') {
        onMessage = listener;
      }
    });
    vi.stubGlobal('postMessage', (response: WorkerResponse) => posted.push(response));
    vi.stubGlobal('self', { location: { href: 'http://localhost/' } });

    await import('./market-generator.worker');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('publishes the totals until a new run replaces it or it is told to stop', async () => {
    start();

    await vi.advanceTimersByTimeAsync(2 * publishIntervalMs);

    expect(volumes()).toEqual([50, 100]);

    start();

    await vi.advanceTimersByTimeAsync(publishIntervalMs);

    expect(volumes()).toEqual([50, 100, 50]);

    stop();

    await vi.advanceTimersByTimeAsync(publishIntervalMs);

    expect(volumes()).toEqual([50, 100, 50]);
  });
});
