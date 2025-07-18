import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordEditComponent } from './password.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('PasswordEditComponent', () => {
  let component: PasswordEditComponent;
  let fixture: ComponentFixture<PasswordEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordEditComponent, BrowserAnimationsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordEditComponent);
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

  describe('ngOnInit', () => {
    it('should reset masked password value to empty string', () => {
      component.value = '***';
      component.ngOnInit();
      expect(component.value).toBe('');
    });

    it('should not emit onFieldChange when password is masked (empty after reset)', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.value = '***';
      component.ngOnInit();
      expect(event).not.toHaveBeenCalled();
    });

    it('should emit onFieldChange when password has actual value', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.value = 'actualPassword';
      component.ngOnInit();
      expect(event).toHaveBeenCalledWith('actualPassword');
    });

    it('should not emit onFieldChange when password is empty string', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.value = '';
      component.ngOnInit();
      expect(event).not.toHaveBeenCalled();
    });
  });

  describe('onPasswordChange', () => {
    it('should emit onFieldChange when password has value', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.onPasswordChange('newPassword');
      expect(event).toHaveBeenCalledWith('newPassword');
    });

    it('should not emit onFieldChange when password is empty string', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.onPasswordChange('');
      expect(event).not.toHaveBeenCalled();
    });

    it('should emit onFieldChange when password is whitespace (actual value)', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.onPasswordChange('   ');
      expect(event).toHaveBeenCalledWith('   ');
    });
  });

  describe('onClearPasswordChange', () => {
    it('should emit null when clearPassword is true', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.clearPassword = true;
      component.onClearPasswordChange();
      expect(event).toHaveBeenCalledWith(null);
    });

    it('should not emit when clearPassword is false', () => {
      const event = spyOn(component.onFieldChange, 'emit');
      component.clearPassword = false;
      component.onClearPasswordChange();
      expect(event).not.toHaveBeenCalled();
    });
  });
});
