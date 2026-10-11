import { PRODUCER_SETTINGS_RANGES } from '../../services/market.model';

import type { FieldValidator } from '@angular/forms/signals';
import type { ProducerSettings } from '../../services/market.model';

export function wholeNumberWithin(setting: keyof ProducerSettings): FieldValidator<number> {
  const { min, max } = PRODUCER_SETTINGS_RANGES[setting];
  const demand = `Use a whole number between ${min} and ${max}`;

  return ({ value }) => {
    const number = value();

    if (!Number.isInteger(number)) {
      return { kind: 'integer', message: demand };
    }

    return number < min || number > max ? { kind: 'range', message: demand } : undefined;
  };
}
