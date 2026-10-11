import type { WorkerRequest, WorkerResponse } from './market-generator.worker.contract';

export class WorkerMock {
  readonly sent: WorkerRequest[] = [];
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  addEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener as (event: unknown) => void);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: never) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((entry) => (entry as unknown) !== (listener as unknown)),
    );
  }

  postMessage(request: WorkerRequest): void {
    this.sent.push(request);
  }

  respond(response: WorkerResponse): void {
    this.dispatch('message', { data: response });
  }

  fail(message: string): void {
    this.dispatch('error', { message });
  }

  private dispatch(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}
