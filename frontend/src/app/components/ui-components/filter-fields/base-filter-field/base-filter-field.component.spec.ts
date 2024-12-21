import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseFilterFieldComponent } from './base-filter-field.component';

describe('BaseFilterFieldComponent', () => {
  let component: BaseFilterFieldComponent;
  let fixture: ComponentFixture<BaseFilterFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseFilterFieldComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BaseFilterFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
