import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MarketRunService } from '../../services/market-run-service/market-run.service';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DecimalPipe],
  styleUrl: './dashboard.component.scss',
  templateUrl: './dashboard.component.html',
})
export class Dashboard {
  private readonly marketRunService = inject(MarketRunService);

  readonly paused = this.marketRunService.paused;
  readonly metrics = this.marketRunService.metrics;
  readonly failure = this.marketRunService.failure;

  togglePause(): void {
    if (this.paused()) {
      this.marketRunService.resume();
      return;
    }

    this.marketRunService.pause();
  }
}
