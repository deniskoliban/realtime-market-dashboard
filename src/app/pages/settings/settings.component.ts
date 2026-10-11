import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, form, submit, validate } from '@angular/forms/signals';

import { MarketRunService } from '../../services/market-run-service/market-run.service';
import { DEFAULT_PRODUCER_SETTINGS } from '../../services/market.model';
import { wholeNumberWithin } from './whole-number-within.validator';

import type { ProducerSettings } from '../../services/market.model';

@Component({
  selector: 'app-settings',
  imports: [FormField],
  styleUrl: './settings.component.scss',
  templateUrl: './settings.component.html',
})
export class Settings {
  private readonly marketRunService = inject(MarketRunService);
  private readonly router = inject(Router);

  private readonly model = signal<ProducerSettings>(
    this.marketRunService.settings() ?? DEFAULT_PRODUCER_SETTINGS,
  );

  readonly settings = form(this.model, (path) => {
    validate(path.instrumentCount, wholeNumberWithin('instrumentCount'));
    validate(path.updatesPerBatch, wholeNumberWithin('updatesPerBatch'));
    validate(path.batchIntervalMs, wholeNumberWithin('batchIntervalMs'));
  });

  apply(): void {
    submit(this.settings, async () => {
      this.marketRunService.start(this.model());
      await this.router.navigate(['/dashboard']);
    });
  }
}
