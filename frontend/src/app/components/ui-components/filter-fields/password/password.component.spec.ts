import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordFilterComponent } from './password.component';

describe('PasswordFilterComponent', () => {
  let component: PasswordFilterComponent;
  let fixture: ComponentFixture<PasswordFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PasswordFilterComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should send onChange event with new null value if user clear password', () => {
    component.clearPassword = true;
    const event = spyOn(component.onFieldChange, 'emit');
    component.onClearPasswordChange();
    expect(event).toHaveBeenCalledWith(null);
  });
});
