import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimezoneRecordViewComponent } from './timezone.component';

describe('TimezoneRecordViewComponent', () => {
  let component: TimezoneRecordViewComponent;
  let fixture: ComponentFixture<TimezoneRecordViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimezoneRecordViewComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimezoneRecordViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display formatted timezone with UTC offset', () => {
    component.value = 'America/New_York';
    expect(component.formattedTimezone).toContain('America/New_York');
    expect(component.formattedTimezone).toContain('UTC');
  });

  it('should display dash for null value', () => {
    component.value = null;
    expect(component.formattedTimezone).toBe('—');
  });
});
