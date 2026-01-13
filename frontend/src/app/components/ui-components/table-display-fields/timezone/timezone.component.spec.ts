import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimezoneDisplayComponent } from './timezone.component';

describe('TimezoneDisplayComponent', () => {
  let component: TimezoneDisplayComponent;
  let fixture: ComponentFixture<TimezoneDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimezoneDisplayComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimezoneDisplayComponent);
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

  it('should emit copy event on button click', () => {
    spyOn(component.onCopyToClipboard, 'emit');
    component.value = 'Europe/London';
    const compiled = fixture.nativeElement;
    const button = compiled.querySelector('button');
    expect(button).toBeTruthy();
  });
});
