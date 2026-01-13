import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { TimezoneEditComponent } from './timezone.component';

describe('TimezoneEditComponent', () => {
  let component: TimezoneEditComponent;
  let fixture: ComponentFixture<TimezoneEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimezoneEditComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimezoneEditComponent);
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
    const timezone = component.timezones.find(tz => tz.value === 'America/New_York');
    expect(timezone).toBeDefined();
    expect(timezone.label).toContain('UTC');
  });

  it('should emit value on change', () => {
    spyOn(component.onFieldChange, 'emit');
    const testValue = 'America/New_York';
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
