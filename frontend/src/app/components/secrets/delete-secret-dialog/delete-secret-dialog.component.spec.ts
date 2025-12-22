import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of, throwError } from 'rxjs';

import { DeleteSecretDialogComponent } from './delete-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, DeleteSecretResponse } from 'src/app/models/secret';

describe('DeleteSecretDialogComponent', () => {
  let component: DeleteSecretDialogComponent;
  let fixture: ComponentFixture<DeleteSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteSecretDialogComponent>>;

  const mockSecret: Secret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  const mockSecretWithEncryption: Secret = {
    ...mockSecret,
    masterEncryption: true,
  };

  const mockDeleteResponse: DeleteSecretResponse = {
    message: 'Secret deleted successfully',
    deletedAt: '2024-01-01T00:00:00Z',
  };

  const createComponent = async (secret: Secret = mockSecret) => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['deleteSecret']);
    mockSecretsService.deleteSecret.and.returnValue(of(mockDeleteResponse));

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        DeleteSecretDialogComponent,
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

    fixture = TestBed.createComponent(DeleteSecretDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should initialize with submitting false', () => {
      expect(component.submitting).toBeFalse();
    });

    it('should have access to secret data', () => {
      expect(component.data.secret).toEqual(mockSecret);
    });

    it('should have access to secret slug', () => {
      expect(component.data.secret.slug).toBe('test-secret');
    });
  });

  describe('onDelete', () => {
    it('should call deleteSecret with correct slug', () => {
      component.onDelete();
      expect(mockSecretsService.deleteSecret).toHaveBeenCalledWith('test-secret');
    });

    it('should set submitting to true during deletion', () => {
      expect(component.submitting).toBeFalse();
      component.onDelete();
    });

    it('should close dialog with true after successful deletion', () => {
      component.onDelete();
      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should reset submitting after successful deletion', () => {
      component.onDelete();
      expect(component.submitting).toBeFalse();
    });

    it('should reset submitting on error', () => {
      mockSecretsService.deleteSecret.and.returnValue(throwError(() => new Error('Error')));

      component.onDelete();

      expect(component.submitting).toBeFalse();
    });

    it('should not close dialog on error', () => {
      mockSecretsService.deleteSecret.and.returnValue(throwError(() => new Error('Error')));

      component.onDelete();

      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('with encrypted secret', () => {
    beforeEach(async () => {
      await TestBed.resetTestingModule();
      await createComponent(mockSecretWithEncryption);
    });

    it('should have access to encrypted secret data', () => {
      expect(component.data.secret.masterEncryption).toBeTrue();
    });

    it('should delete encrypted secret with correct slug', () => {
      component.onDelete();
      expect(mockSecretsService.deleteSecret).toHaveBeenCalledWith('test-secret');
    });
  });

  describe('dialog interactions', () => {
    it('should only call deleteSecret once per click', () => {
      component.onDelete();
      expect(mockSecretsService.deleteSecret).toHaveBeenCalledTimes(1);
    });

    it('should close dialog only once after successful deletion', () => {
      component.onDelete();
      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });
  });
});
