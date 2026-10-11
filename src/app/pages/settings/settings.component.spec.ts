import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Settings } from './settings.component';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Settings] }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
  });

  it('renders the settings page', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('settings works!');
  });
});
