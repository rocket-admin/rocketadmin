import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseEditFieldComponent } from './base-row-field.component';

describe('BaseEditFieldComponent', () => {
  let component: BaseEditFieldComponent;
  let fixture: ComponentFixture<BaseEditFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseEditFieldComponent]
    }).compileComponents();


    fixture = TestBed.createComponent(BaseEditFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
