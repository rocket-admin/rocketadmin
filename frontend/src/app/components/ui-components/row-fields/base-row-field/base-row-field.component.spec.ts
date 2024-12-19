import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseRowFieldComponent } from './base-row-field.component';

describe('BaseRowFieldComponent', () => {
  let component: BaseRowFieldComponent;
  let fixture: ComponentFixture<BaseRowFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [BaseRowFieldComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(BaseRowFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
