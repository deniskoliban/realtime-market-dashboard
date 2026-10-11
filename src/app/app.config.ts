import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { MarketRunService } from './services/market-run-service/market-run.service';
import { DEFAULT_PRODUCER_SETTINGS } from './core/market.model';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppInitializer(() => {
      inject(MarketRunService).start(DEFAULT_PRODUCER_SETTINGS);
    }),
  ],
};
