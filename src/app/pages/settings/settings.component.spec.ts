import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Settings } from './settings.component';
import { MarketRunService } from '../../services/market-run-service/market-run.service';
import { DEFAULT_PRODUCER_SETTINGS } from '../../services/market.model';

import type { ProducerSettings } from '../../services/market.model';

class MarketRunServiceMock {
  readonly settings = signal<ProducerSettings | null>(null);
  readonly startedWith: ProducerSettings[] = [];

  start(settings: ProducerSettings): void {
    this.startedWith.push(settings);
  }
}

class RouterMock {
  readonly navigatedTo: unknown[][] = [];

  navigate(commands: unknown[]): Promise<boolean> {
    this.navigatedTo.push(commands);

    return Promise.resolve(true);
  }
}

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let marketRunService: MarketRunServiceMock;
  let router: RouterMock;

  beforeEach(async () => {
    marketRunService = new MarketRunServiceMock();
    router = new RouterMock();

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        { provide: MarketRunService, useValue: marketRunService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  async function createSettings(): Promise<void> {
    fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function inputFor(caption: string): HTMLInputElement {
    const label = Array.from(host().querySelectorAll('label')).find((entry) =>
      (entry.textContent ?? '').includes(caption),
    );
    const input = label?.querySelector('input');

    if (!input) {
      throw new Error(`no field labelled ${caption}`);
    }

    return input;
  }

  function applyButton(): HTMLButtonElement {
    const button = host().querySelector('button');

    if (!button) {
      throw new Error('no apply control');
    }

    return button;
  }

  function message(): string {
    return (host().querySelector('.error')?.textContent ?? '').trim();
  }

  async function enter(caption: string, value: string): Promise<void> {
    const input = inputFor(caption);

    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));

    await fixture.whenStable();
  }

  it('opens with the defaults, with the fields and an enabled apply control', async () => {
    await createSettings();

    expect(inputFor('Instrument count').valueAsNumber).toBe(
      DEFAULT_PRODUCER_SETTINGS.instrumentCount,
    );
    expect(inputFor('Updates per batch').valueAsNumber).toBe(
      DEFAULT_PRODUCER_SETTINGS.updatesPerBatch,
    );
    expect(inputFor('Batch interval').valueAsNumber).toBe(
      DEFAULT_PRODUCER_SETTINGS.batchIntervalMs,
    );
    expect(message()).toBe('');
    expect(applyButton().disabled).toBe(false);
  });

  it('opens with the settings of the run in progress', async () => {
    const running: ProducerSettings = {
      instrumentCount: 7,
      updatesPerBatch: 50,
      batchIntervalMs: 1000,
    };

    marketRunService.settings.set(running);

    await createSettings();

    expect(inputFor('Instrument count').valueAsNumber).toBe(7);
    expect(inputFor('Updates per batch').valueAsNumber).toBe(50);
    expect(inputFor('Batch interval').valueAsNumber).toBe(1000);
  });

  it('rejects a value above its range and keeps apply disabled', async () => {
    await createSettings();

    await enter('Instrument count', '51');

    expect(message()).toBe('Use a whole number between 1 and 50');
    expect(applyButton().disabled).toBe(true);
  });

  it('rejects a fractional value', async () => {
    await createSettings();

    await enter('Updates per batch', '1000.5');

    expect(message()).toBe('Use a whole number between 1 and 1000');
    expect(applyButton().disabled).toBe(true);
  });

  it('rejects an emptied field', async () => {
    await createSettings();

    await enter('Batch interval', '');

    expect(message()).toBe('Use a whole number between 50 and 2000');
    expect(applyButton().disabled).toBe(true);
  });

  it('starts a run with the entered settings when applied', async () => {
    await createSettings();

    await enter('Instrument count', '10');
    await enter('Updates per batch', '200');
    await enter('Batch interval', '250');

    applyButton().click();
    await fixture.whenStable();

    const applied: ProducerSettings = {
      instrumentCount: 10,
      updatesPerBatch: 200,
      batchIntervalMs: 250,
    };

    expect(marketRunService.startedWith).toEqual([applied]);
    expect(router.navigatedTo).toEqual([['/dashboard']]);
  });

  it('does not start a run while a value is out of range', async () => {
    await createSettings();

    await enter('Instrument count', '0');

    applyButton().click();
    await fixture.whenStable();

    expect(marketRunService.startedWith).toEqual([]);
    expect(router.navigatedTo).toEqual([]);
  });
});
