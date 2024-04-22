import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { NumberFilterComponent } from './number.component';

describe('NumberFilterComponent', () => {
  let component: NumberFilterComponent;
  let fixture: ComponentFixture<NumberFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NumberFilterComponent ]
    })
    .compileComponents();
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
