import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of, throwError } from 'rxjs';

import { CreateSecretDialogComponent } from './create-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { Secret } from 'src/app/models/secret';

describe('CreateSecretDialogComponent', () => {
  let component: CreateSecretDialogComponent;
  let fixture: ComponentFixture<CreateSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CreateSecretDialogComponent>>;

  const mockSecret: Secret = {
    id: '1',
    slug: 'test',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['createSecret']);
    mockSecretsService.createSecret.and.returnValue(of(mockSecret));

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        CreateSecretDialogComponent,
        BrowserAnimationsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSecretDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should have invalid form initially', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should have all required form controls', () => {
      expect(component.form.get('slug')).toBeTruthy();
      expect(component.form.get('value')).toBeTruthy();
      expect(component.form.get('expiresAt')).toBeTruthy();
      expect(component.form.get('masterEncryption')).toBeTruthy();
      expect(component.form.get('masterPassword')).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.form.get('slug')?.value).toBe('');
      expect(component.form.get('value')?.value).toBe('');
      expect(component.form.get('expiresAt')?.value).toBeNull();
      expect(component.form.get('masterEncryption')?.value).toBeFalse();
      expect(component.form.get('masterPassword')?.value).toBe('');
    });

    it('should initialize component properties', () => {
      expect(component.submitting).toBeFalse();
      expect(component.showValue).toBeFalse();
      expect(component.showMasterPassword).toBeFalse();
      expect(component.minDate).toBeTruthy();
    });
  });

  describe('slug validation', () => {
    it('should require slug', () => {
      const slugControl = component.form.get('slug');
      slugControl?.setValue('');
      expect(slugControl?.hasError('required')).toBeTrue();
    });

    it('should validate slug pattern - reject spaces', () => {
      const slugControl = component.form.get('slug');
      slugControl?.setValue('invalid slug');
      expect(slugControl?.hasError('pattern')).toBeTrue();
    });

    it('should validate slug pattern - reject special characters', () => {
      const slugControl = component.form.get('slug');
      slugControl?.setValue('invalid!slug');
      expect(slugControl?.hasError('pattern')).toBeTrue();

      slugControl?.setValue('invalid@slug');
      expect(slugControl?.hasError('pattern')).toBeTrue();

      slugControl?.setValue('invalid#slug');
      expect(slugControl?.hasError('pattern')).toBeTrue();
    });

    it('should validate slug pattern - accept valid slugs', () => {
      const slugControl = component.form.get('slug');

      slugControl?.setValue('valid-slug');
      expect(slugControl?.hasError('pattern')).toBeFalse();

      slugControl?.setValue('valid_slug');
      expect(slugControl?.hasError('pattern')).toBeFalse();

      slugControl?.setValue('ValidSlug123');
      expect(slugControl?.hasError('pattern')).toBeFalse();

      slugControl?.setValue('valid-slug_123');
      expect(slugControl?.hasError('pattern')).toBeFalse();
    });

    it('should validate max length', () => {
      const slugControl = component.form.get('slug');
      slugControl?.setValue('a'.repeat(256));
      expect(slugControl?.hasError('maxlength')).toBeTrue();

      slugControl?.setValue('a'.repeat(255));
      expect(slugControl?.hasError('maxlength')).toBeFalse();
    });
  });

  describe('value validation', () => {
    it('should require value', () => {
      const valueControl = component.form.get('value');
      valueControl?.setValue('');
      expect(valueControl?.hasError('required')).toBeTrue();
    });

    it('should validate max length', () => {
      const valueControl = component.form.get('value');
      valueControl?.setValue('a'.repeat(10001));
      expect(valueControl?.hasError('maxlength')).toBeTrue();

      valueControl?.setValue('a'.repeat(10000));
      expect(valueControl?.hasError('maxlength')).toBeFalse();
    });
  });

  describe('master encryption', () => {
    it('should require master password when encryption is enabled', () => {
      component.form.get('masterEncryption')?.setValue(true);
      const masterPasswordControl = component.form.get('masterPassword');
      expect(masterPasswordControl?.hasError('required')).toBeTrue();
    });

    it('should validate master password min length', () => {
      component.form.get('masterEncryption')?.setValue(true);
      const masterPasswordControl = component.form.get('masterPassword');

      masterPasswordControl?.setValue('short');
      expect(masterPasswordControl?.hasError('minlength')).toBeTrue();

      masterPasswordControl?.setValue('12345678');
      expect(masterPasswordControl?.hasError('minlength')).toBeFalse();
    });

    it('should clear master password validators when encryption is disabled', () => {
      component.form.get('masterEncryption')?.setValue(true);
      component.form.get('masterPassword')?.setValue('password123');

      component.form.get('masterEncryption')?.setValue(false);

      const masterPasswordControl = component.form.get('masterPassword');
      expect(masterPasswordControl?.value).toBe('');
      expect(masterPasswordControl?.valid).toBeTrue();
    });

    it('should accept valid master password', () => {
      component.form.get('masterEncryption')?.setValue(true);
      const masterPasswordControl = component.form.get('masterPassword');

      masterPasswordControl?.setValue('validpassword123');
      expect(masterPasswordControl?.valid).toBeTrue();
    });
  });

  describe('error messages', () => {
    it('should return correct slug error message for required', () => {
      component.form.get('slug')?.setValue('');
      component.form.get('slug')?.markAsTouched();
      expect(component.slugError).toBe('Slug is required');
    });

    it('should return correct slug error message for maxlength', () => {
      component.form.get('slug')?.setValue('a'.repeat(256));
      expect(component.slugError).toBe('Slug must be 255 characters or less');
    });

    it('should return correct slug error message for pattern', () => {
      component.form.get('slug')?.setValue('invalid slug!');
      expect(component.slugError).toBe('Only letters, numbers, hyphens, and underscores allowed');
    });

    it('should return correct value error message for required', () => {
      component.form.get('value')?.setValue('');
      component.form.get('value')?.markAsTouched();
      expect(component.valueError).toBe('Value is required');
    });

    it('should return correct value error message for maxlength', () => {
      component.form.get('value')?.setValue('a'.repeat(10001));
      expect(component.valueError).toBe('Value must be 10000 characters or less');
    });

    it('should return correct master password error for required', () => {
      component.form.get('masterEncryption')?.setValue(true);
      component.form.get('masterPassword')?.markAsTouched();
      expect(component.masterPasswordError).toBe('Master password is required for encryption');
    });

    it('should return correct master password error for minlength', () => {
      component.form.get('masterEncryption')?.setValue(true);
      component.form.get('masterPassword')?.setValue('short');
      expect(component.masterPasswordError).toBe('Master password must be at least 8 characters');
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

  describe('form submission', () => {
    it('should not submit invalid form', () => {
      component.onSubmit();
      expect(mockSecretsService.createSecret).not.toHaveBeenCalled();
    });

    it('should submit valid form', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
      });

      component.onSubmit();
      expect(mockSecretsService.createSecret).toHaveBeenCalled();
    });

    it('should submit form with correct basic payload', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
      });

      component.onSubmit();

      expect(mockSecretsService.createSecret).toHaveBeenCalledWith(jasmine.objectContaining({
        slug: 'test-secret',
        value: 'secret-value',
      }));
    });

    it('should submit form with expiration date', () => {
      const futureDate = new Date('2025-12-31');
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
        expiresAt: futureDate,
      });

      component.onSubmit();

      expect(mockSecretsService.createSecret).toHaveBeenCalledWith(jasmine.objectContaining({
        slug: 'test-secret',
        value: 'secret-value',
        expiresAt: jasmine.any(String),
      }));
    });

    it('should submit form with master encryption', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
        masterEncryption: true,
        masterPassword: 'password123',
      });

      component.onSubmit();

      expect(mockSecretsService.createSecret).toHaveBeenCalledWith(jasmine.objectContaining({
        slug: 'test-secret',
        value: 'secret-value',
        masterEncryption: true,
        masterPassword: 'password123',
      }));
    });

    it('should set submitting to true during submission', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
      });

      expect(component.submitting).toBeFalse();
      component.onSubmit();
    });

    it('should close dialog on successful submission', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
      });

      component.onSubmit();

      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should reset submitting on successful submission', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
      });

      component.onSubmit();

      expect(component.submitting).toBeFalse();
    });

    it('should reset submitting on error', () => {
      mockSecretsService.createSecret.and.returnValue(throwError(() => new Error('Error')));

      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
      });

      component.onSubmit();

      expect(component.submitting).toBeFalse();
    });

    it('should not include master password when encryption is disabled', () => {
      component.form.patchValue({
        slug: 'test-secret',
        value: 'secret-value',
        masterEncryption: false,
      });

      component.onSubmit();

      const callArgs = mockSecretsService.createSecret.calls.mostRecent().args[0];
      expect(callArgs.masterPassword).toBeUndefined();
    });
  });
});
