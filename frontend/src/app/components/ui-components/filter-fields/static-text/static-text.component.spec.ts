import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { StaticTextFilterComponent } from './static-text.component';

describe('StaticTextFilterComponent', () => {
  let component: StaticTextFilterComponent;
  let fixture: ComponentFixture<StaticTextFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StaticTextFilterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StaticTextFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
