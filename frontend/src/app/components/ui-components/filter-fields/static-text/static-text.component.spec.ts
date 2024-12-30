import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaticTextFilterComponent } from './static-text.component';

describe('StaticTextFilterComponent', () => {
  let component: StaticTextFilterComponent;
  let fixture: ComponentFixture<StaticTextFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaticTextFilterComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StaticTextFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
