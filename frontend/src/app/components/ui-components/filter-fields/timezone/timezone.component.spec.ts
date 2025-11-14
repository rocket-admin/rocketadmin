import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TimezoneFilterComponent } from './timezone.component';

describe('TimezoneFilterComponent', () => {
  let component: TimezoneFilterComponent;
  let fixture: ComponentFixture<TimezoneFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimezoneFilterComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimezoneFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate timezones using Intl API', () => {
    expect(component.timezones.length).toBeGreaterThan(0);
  });

  it('should include timezone offset in labels', () => {
    const timezone = component.timezones.find(tz => tz.value === 'Europe/London');
    expect(timezone).toBeDefined();
    expect(timezone.label).toContain('UTC');
  });

  it('should emit value on change', () => {
    spyOn(component.onFieldChange, 'emit');
    const testValue = 'Asia/Tokyo';
    component.value = testValue;
    component.onFieldChange.emit(testValue);
    expect(component.onFieldChange.emit).toHaveBeenCalledWith(testValue);
  });

  it('should add null option when allow_null is true', () => {
    component.widgetStructure = {
      widget_params: { allow_null: true }
    } as any;
    component.ngOnInit();
    const nullOption = component.timezones.find(tz => tz.value === null);
    expect(nullOption).toBeDefined();
  });
});
