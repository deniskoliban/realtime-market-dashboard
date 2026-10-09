import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';
import { GENERATOR_LOADER } from '../../services/market-generator';
import init from '@wasm/market_generator.js';

const WASM_PATH = join(process.cwd(), 'wasm/pkg/market_generator_bg.wasm');

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        {
          provide: GENERATOR_LOADER,
          useValue: async () => init({ module_or_path: readFileSync(WASM_PATH) }),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    await fixture.componentInstance.ready;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
