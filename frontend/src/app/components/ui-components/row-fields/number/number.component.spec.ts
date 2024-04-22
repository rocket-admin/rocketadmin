import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { NumberRowComponent } from './number.component';

describe('NumberRowComponent', () => {
  let component: NumberRowComponent;
  let fixture: ComponentFixture<NumberRowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NumberRowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NumberRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
