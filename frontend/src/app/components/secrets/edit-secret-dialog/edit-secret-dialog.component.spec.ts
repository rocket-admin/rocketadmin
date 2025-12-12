import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of, throwError } from 'rxjs';

import { EditSecretDialogComponent } from './edit-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { Secret } from 'src/app/models/secret';

describe('EditSecretDialogComponent', () => {
  let component: EditSecretDialogComponent;
  let fixture: ComponentFixture<EditSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<EditSecretDialogComponent>>;

  const mockSecret: Secret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  const mockSecretWithExpiration: Secret = {
    ...mockSecret,
    expiresAt: '2025-12-31T00:00:00Z',
  };

  const mockSecretWithEncryption: Secret = {
    ...mockSecret,
    masterEncryption: true,
  };

  const createComponent = async (secret: Secret = mockSecret) => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['updateSecret']);
    mockSecretsService.updateSecret.and.returnValue(of(secret));

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        EditSecretDialogComponent,
        BrowserAnimationsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { secret } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditSecretDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize form with empty value', () => {
      expect(component.form.get('value')?.value).toBe('');
    });

    it('should have all required form controls', () => {
      expect(component.form.get('value')).toBeTruthy();
      expect(component.form.get('expiresAt')).toBeTruthy();
    });

    it('should initialize component properties', () => {
      expect(component.submitting).toBeFalse();
      expect(component.showValue).toBeFalse();
      expect(component.masterPassword).toBe('');
      expect(component.masterPasswordError).toBe('');
      expect(component.showMasterPassword).toBeFalse();
      expect(component.clearExpiration).toBeFalse();
      expect(component.minDate).toBeTruthy();
    });

    it('should initialize with null expiresAt when secret has no expiration', () => {
      expect(component.form.get('expiresAt')?.value).toBeNull();
    });
  });

  describe('form initialization with expiration', () => {
    beforeEach(async () => {
      await TestBed.resetTestingModule();
      await createComponent(mockSecretWithExpiration);
    });

    it('should initialize with existing expiration date', () => {
      const expiresAt = component.form.get('expiresAt')?.value;
      expect(expiresAt).toBeTruthy();
      expect(expiresAt instanceof Date).toBeTrue();
    });
  });

  describe('value validation', () => {
    it('should require value field', () => {
      expect(component.form.get('value')?.valid).toBeFalse();
      component.form.patchValue({ value: 'some-value' });
      expect(component.form.get('value')?.valid).toBeTrue();
    });

    it('should validate max length', () => {
      const valueControl = component.form.get('value');
      valueControl?.setValue('a'.repeat(10001));
      expect(valueControl?.hasError('maxlength')).toBeTrue();

      valueControl?.setValue('a'.repeat(10000));
      expect(valueControl?.hasError('maxlength')).toBeFalse();
    });
  });

  describe('error messages', () => {
    it('should return correct value error message for required', () => {
      component.form.get('value')?.setValue('');
      component.form.get('value')?.markAsTouched();
      expect(component.valueError).toBe('New value is required');
    });

    it('should return correct value error message for maxlength', () => {
      component.form.get('value')?.setValue('a'.repeat(10001));
      expect(component.valueError).toBe('Value must be 10000 characters or less');
    });

    it('should return empty string when no errors', () => {
      component.form.get('value')?.setValue('valid-value');
      expect(component.valueError).toBe('');
    });
  });

  describe('visibility toggles', () => {
    it('should toggle value visibility', () => {
      expect(component.showValue).toBeFalse();
      component.toggleValueVisibility();
      expect(component.showValue).toBeTrue();
      component.toggleValueVisibility();
      expect(component.showValue).toBeFalse();
    });

    it('should toggle master password visibility', () => {
      expect(component.showMasterPassword).toBeFalse();
      component.toggleMasterPasswordVisibility();
      expect(component.showMasterPassword).toBeTrue();
      component.toggleMasterPasswordVisibility();
      expect(component.showMasterPassword).toBeFalse();
    });
  });

  describe('clear expiration', () => {
    it('should disable expiresAt control when clearExpiration is true', () => {
      component.onClearExpirationChange(true);

      expect(component.clearExpiration).toBeTrue();
      expect(component.form.get('expiresAt')?.disabled).toBeTrue();
    });

    it('should enable expiresAt control when clearExpiration is false', () => {
      component.onClearExpirationChange(true);
      component.onClearExpirationChange(false);

      expect(component.clearExpiration).toBeFalse();
      expect(component.form.get('expiresAt')?.enabled).toBeTrue();
    });
  });

  describe('form submission', () => {
    it('should not submit invalid form', () => {
      component.onSubmit();
      expect(mockSecretsService.updateSecret).not.toHaveBeenCalled();
    });

    it('should submit updated secret', () => {
      component.form.patchValue({ value: 'new-value' });
      component.onSubmit();
      expect(mockSecretsService.updateSecret).toHaveBeenCalled();
    });

    it('should submit with correct payload', () => {
      component.form.patchValue({ value: 'new-value' });
      component.onSubmit();

      expect(mockSecretsService.updateSecret).toHaveBeenCalledWith(
        'test-secret',
        jasmine.objectContaining({ value: 'new-value' }),
        undefined
      );
    });

    it('should submit with expiration date', () => {
      const futureDate = new Date('2026-01-01');
      component.form.patchValue({
        value: 'new-value',
        expiresAt: futureDate,
      });

      component.onSubmit();

      expect(mockSecretsService.updateSecret).toHaveBeenCalledWith(
        'test-secret',
        jasmine.objectContaining({
          value: 'new-value',
          expiresAt: jasmine.any(String),
        }),
        undefined
      );
    });

    it('should submit with null expiration when clearExpiration is true', () => {
      component.form.patchValue({ value: 'new-value' });
      component.onClearExpirationChange(true);

      component.onSubmit();

      expect(mockSecretsService.updateSecret).toHaveBeenCalledWith(
        'test-secret',
        jasmine.objectContaining({
          value: 'new-value',
          expiresAt: null,
        }),
        undefined
      );
    });

    it('should set submitting to true during submission', () => {
      component.form.patchValue({ value: 'new-value' });

      expect(component.submitting).toBeFalse();
      component.onSubmit();
    });

    it('should close dialog on successful submission', () => {
      component.form.patchValue({ value: 'new-value' });

      component.onSubmit();

      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should reset submitting on successful submission', () => {
      component.form.patchValue({ value: 'new-value' });

      component.onSubmit();

      expect(component.submitting).toBeFalse();
    });
  });

  describe('master encryption', () => {
    beforeEach(async () => {
      await TestBed.resetTestingModule();
      await createComponent(mockSecretWithEncryption);
    });

    it('should require master password for encrypted secrets', () => {
      component.form.patchValue({ value: 'new-value' });
      component.masterPassword = '';

      component.onSubmit();

      expect(component.masterPasswordError).toBe('Master password is required');
      expect(mockSecretsService.updateSecret).not.toHaveBeenCalled();
    });

    it('should submit with master password for encrypted secrets', () => {
      component.form.patchValue({ value: 'new-value' });
      component.masterPassword = 'my-master-password';

      component.onSubmit();

      expect(mockSecretsService.updateSecret).toHaveBeenCalledWith(
        'test-secret',
        jasmine.objectContaining({ value: 'new-value' }),
        'my-master-password'
      );
    });

    it('should show error on 403 response (invalid master password)', () => {
      mockSecretsService.updateSecret.and.returnValue(
        throwError(() => ({ status: 403 }))
      );

      component.form.patchValue({ value: 'new-value' });
      component.masterPassword = 'wrong-password';

      component.onSubmit();

      expect(component.masterPasswordError).toBe('Invalid master password');
      expect(component.submitting).toBeFalse();
    });

    it('should clear master password error on new submission attempt', () => {
      component.masterPasswordError = 'Previous error';
      component.form.patchValue({ value: 'new-value' });
      component.masterPassword = '';

      component.onSubmit();

      expect(component.masterPasswordError).toBe('Master password is required');
    });
  });

  describe('non-encrypted secret submission', () => {
    it('should not send master password for non-encrypted secrets', () => {
      component.form.patchValue({ value: 'new-value' });
      component.masterPassword = 'some-password';

      component.onSubmit();

      expect(mockSecretsService.updateSecret).toHaveBeenCalledWith(
        'test-secret',
        jasmine.objectContaining({ value: 'new-value' }),
        undefined
      );
    });
  });

  describe('error handling', () => {
    it('should reset submitting on non-403 error', () => {
      mockSecretsService.updateSecret.and.returnValue(
        throwError(() => ({ status: 500 }))
      );

      component.form.patchValue({ value: 'new-value' });
      component.onSubmit();

      expect(component.submitting).toBeFalse();
    });
  });
});
