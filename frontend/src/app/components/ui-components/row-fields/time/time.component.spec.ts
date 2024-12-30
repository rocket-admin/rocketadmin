import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeRowComponent } from './time.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TimeRowComponent', () => {
  let component: TimeRowComponent;
  let fixture: ComponentFixture<TimeRowComponent>;

  beforeEach(async() => {
    await TestBed.configureTestingModule({
    imports: [TimeRowComponent, BrowserAnimationsModule]
  }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
