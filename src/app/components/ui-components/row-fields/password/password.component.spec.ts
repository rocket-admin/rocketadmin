import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordComponent } from './password.component';

describe('PasswordComponent', () => {
  let component: PasswordComponent;
  let fixture: ComponentFixture<PasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PasswordComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordComponent);
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
