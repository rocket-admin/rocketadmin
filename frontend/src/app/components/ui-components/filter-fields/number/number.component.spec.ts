import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberFilterComponent } from './number.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('NumberFilterComponent', () => {
  let component: NumberFilterComponent;
  let fixture: ComponentFixture<NumberFilterComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [NumberFilterComponent, BrowserAnimationsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NumberFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
