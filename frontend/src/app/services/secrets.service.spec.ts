import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { SecretsService } from './secrets.service';
import { NotificationsService } from './notifications.service';
import {
  Secret,
  SecretListResponse,
  AuditLogResponse,
  CreateSecretPayload,
  UpdateSecretPayload,
  DeleteSecretResponse,
} from '../models/secret';

describe('SecretsService', () => {
  let service: SecretsService;
  let httpMock: HttpTestingController;
  let fakeNotifications: jasmine.SpyObj<NotificationsService>;

  const mockSecret: Secret = {
    id: '1',
    slug: 'test-secret',
    companyId: 'company-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    masterEncryption: false,
  };

  const mockSecretWithExpiration: Secret = {
    ...mockSecret,
    expiresAt: '2025-01-01T00:00:00Z',
  };

  const mockSecretListResponse: SecretListResponse = {
    data: [mockSecret, mockSecretWithExpiration],
    pagination: {
      total: 2,
      currentPage: 1,
      perPage: 20,
      lastPage: 1,
    },
  };

  const mockAuditLogResponse: AuditLogResponse = {
    data: [
      {
        id: '1',
        action: 'create',
        user: { id: 'user-1', email: 'user@example.com' },
        accessedAt: '2024-01-01T00:00:00Z',
        success: true,
      },
      {
        id: '2',
        action: 'view',
        user: { id: 'user-1', email: 'user@example.com' },
        accessedAt: '2024-01-02T00:00:00Z',
        success: true,
      },
    ],
    pagination: {
      total: 2,
      currentPage: 1,
      perPage: 50,
      lastPage: 1,
    },
  };

  const mockDeleteResponse: DeleteSecretResponse = {
    message: 'Secret deleted successfully',
    deletedAt: '2024-01-01T00:00:00Z',
  };

  const fakeError = {
    message: 'Something went wrong',
    statusCode: 400,
  };

  beforeEach(() => {
    fakeNotifications = jasmine.createSpyObj('NotificationsService', [
      'showErrorSnackbar',
      'showSuccessSnackbar',
    ]);

    TestBed.configureTestingModule({
      imports: [MatSnackBarModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SecretsService,
        { provide: NotificationsService, useValue: fakeNotifications },
      ],
    });

    service = TestBed.inject(SecretsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchSecrets', () => {
    it('should fetch secrets with default pagination', () => {
      let result: SecretListResponse | undefined;

      service.fetchSecrets().subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets?page=1&limit=20');
      expect(req.request.method).toBe('GET');
      req.flush(mockSecretListResponse);

      expect(result).toEqual(mockSecretListResponse);
    });

    it('should fetch secrets with custom pagination', () => {
      let result: SecretListResponse | undefined;

      service.fetchSecrets(2, 10).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets?page=2&limit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockSecretListResponse);

      expect(result).toEqual(mockSecretListResponse);
    });

    it('should fetch secrets with search query', () => {
      let result: SecretListResponse | undefined;

      service.fetchSecrets(1, 20, 'api-key').subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets?page=1&limit=20&search=api-key');
      expect(req.request.method).toBe('GET');
      req.flush(mockSecretListResponse);

      expect(result).toEqual(mockSecretListResponse);
    });

    it('should show error snackbar on fetch failure', async () => {
      const promise = service.fetchSecrets().toPromise();

      const req = httpMock.expectOne('/secrets?page=1&limit=20');
      req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
    });

    it('should show default error message when error has no message', async () => {
      const promise = service.fetchSecrets().toPromise();

      const req = httpMock.expectOne('/secrets?page=1&limit=20');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith('Failed to fetch secrets');
    });
  });

  describe('createSecret', () => {
    const createPayload: CreateSecretPayload = {
      slug: 'new-secret',
      value: 'secret-value',
    };

    it('should create a secret successfully', () => {
      let result: Secret | undefined;

      service.createSecret(createPayload).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createPayload);
      req.flush(mockSecret);

      expect(result).toEqual(mockSecret);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Secret created successfully');
    });

    it('should create a secret with expiration', () => {
      const payloadWithExpiration: CreateSecretPayload = {
        ...createPayload,
        expiresAt: '2025-01-01T00:00:00Z',
      };

      service.createSecret(payloadWithExpiration).subscribe();

      const req = httpMock.expectOne('/secrets');
      expect(req.request.body).toEqual(payloadWithExpiration);
      req.flush(mockSecretWithExpiration);
    });

    it('should create a secret with master encryption', () => {
      const payloadWithEncryption: CreateSecretPayload = {
        ...createPayload,
        masterEncryption: true,
        masterPassword: 'my-master-password',
      };

      service.createSecret(payloadWithEncryption).subscribe();

      const req = httpMock.expectOne('/secrets');
      expect(req.request.body).toEqual(payloadWithEncryption);
      req.flush({ ...mockSecret, masterEncryption: true });
    });

    it('should emit secretsUpdated on successful creation', () => {
      let updateAction: string | undefined;
      service.cast.subscribe((action) => {
        updateAction = action;
      });

      service.createSecret(createPayload).subscribe();

      const req = httpMock.expectOne('/secrets');
      req.flush(mockSecret);

      expect(updateAction).toBe('created');
    });

    it('should show conflict error when slug already exists', async () => {
      const promise = service.createSecret(createPayload).toPromise();

      const req = httpMock.expectOne('/secrets');
      req.flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(
        'A secret with this slug already exists'
      );
    });

    it('should show generic error on other failures', async () => {
      const promise = service.createSecret(createPayload).toPromise();

      const req = httpMock.expectOne('/secrets');
      req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
    });
  });

  describe('updateSecret', () => {
    const updatePayload: UpdateSecretPayload = {
      value: 'new-value',
    };

    it('should update a secret successfully', () => {
      let result: Secret | undefined;

      service.updateSecret('test-secret', updatePayload).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets/test-secret');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatePayload);
      req.flush(mockSecret);

      expect(result).toEqual(mockSecret);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Secret updated successfully');
    });

    it('should update a secret with new expiration', () => {
      const payloadWithExpiration: UpdateSecretPayload = {
        ...updatePayload,
        expiresAt: '2026-01-01T00:00:00Z',
      };

      service.updateSecret('test-secret', payloadWithExpiration).subscribe();

      const req = httpMock.expectOne('/secrets/test-secret');
      expect(req.request.body).toEqual(payloadWithExpiration);
      req.flush(mockSecretWithExpiration);
    });

    it('should clear expiration when expiresAt is null', () => {
      const payloadClearExpiration: UpdateSecretPayload = {
        ...updatePayload,
        expiresAt: null,
      };

      service.updateSecret('test-secret', payloadClearExpiration).subscribe();

      const req = httpMock.expectOne('/secrets/test-secret');
      expect(req.request.body).toEqual(payloadClearExpiration);
      req.flush(mockSecret);
    });

    it('should send master password in header when provided', () => {
      service.updateSecret('test-secret', updatePayload, 'master-password-123').subscribe();

      const req = httpMock.expectOne('/secrets/test-secret');
      expect(req.request.headers.get('masterpwd')).toBe('master-password-123');
      req.flush(mockSecret);
    });

    it('should not send master password header when not provided', () => {
      service.updateSecret('test-secret', updatePayload).subscribe();

      const req = httpMock.expectOne('/secrets/test-secret');
      expect(req.request.headers.has('masterpwd')).toBeFalse();
      req.flush(mockSecret);
    });

    it('should emit secretsUpdated on successful update', () => {
      let updateAction: string | undefined;
      service.cast.subscribe((action) => {
        updateAction = action;
      });

      service.updateSecret('test-secret', updatePayload).subscribe();

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush(mockSecret);

      expect(updateAction).toBe('updated');
    });

    it('should throw error on 403 (invalid master password)', async () => {
      let errorThrown = false;

      service.updateSecret('test-secret', updatePayload, 'wrong-password').subscribe({
        error: (err) => {
          errorThrown = true;
          expect(err.status).toBe(403);
        },
      });

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush({ message: 'Invalid master password' }, { status: 403, statusText: 'Forbidden' });

      expect(errorThrown).toBeTrue();
    });

    it('should show error for expired secret (410)', async () => {
      const promise = service.updateSecret('test-secret', updatePayload).toPromise();

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush({ message: 'Secret expired' }, { status: 410, statusText: 'Gone' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(
        'Cannot update an expired secret'
      );
    });

    it('should show generic error on other failures', async () => {
      const promise = service.updateSecret('test-secret', updatePayload).toPromise();

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
    });
  });

  describe('deleteSecret', () => {
    it('should delete a secret successfully', () => {
      let result: DeleteSecretResponse | undefined;

      service.deleteSecret('test-secret').subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets/test-secret');
      expect(req.request.method).toBe('DELETE');
      req.flush(mockDeleteResponse);

      expect(result).toEqual(mockDeleteResponse);
      expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Secret deleted successfully');
    });

    it('should emit secretsUpdated on successful deletion', () => {
      let updateAction: string | undefined;
      service.cast.subscribe((action) => {
        updateAction = action;
      });

      service.deleteSecret('test-secret').subscribe();

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush(mockDeleteResponse);

      expect(updateAction).toBe('deleted');
    });

    it('should show error on delete failure', async () => {
      const promise = service.deleteSecret('test-secret').toPromise();

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
    });

    it('should show default error message when error has no message', async () => {
      const promise = service.deleteSecret('test-secret').toPromise();

      const req = httpMock.expectOne('/secrets/test-secret');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith('Failed to delete secret');
    });
  });

  describe('getAuditLog', () => {
    it('should fetch audit log with default pagination', () => {
      let result: AuditLogResponse | undefined;

      service.getAuditLog('test-secret').subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets/test-secret/audit-log?page=1&limit=50');
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditLogResponse);

      expect(result).toEqual(mockAuditLogResponse);
    });

    it('should fetch audit log with custom pagination', () => {
      let result: AuditLogResponse | undefined;

      service.getAuditLog('test-secret', 2, 25).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne('/secrets/test-secret/audit-log?page=2&limit=25');
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditLogResponse);

      expect(result).toEqual(mockAuditLogResponse);
    });

    it('should show error on audit log fetch failure', async () => {
      const promise = service.getAuditLog('test-secret').toPromise();

      const req = httpMock.expectOne('/secrets/test-secret/audit-log?page=1&limit=50');
      req.flush(fakeError, { status: 400, statusText: 'Bad Request' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith(fakeError.message);
    });

    it('should show default error message when error has no message', async () => {
      const promise = service.getAuditLog('test-secret').toPromise();

      const req = httpMock.expectOne('/secrets/test-secret/audit-log?page=1&limit=50');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      await promise;

      expect(fakeNotifications.showErrorSnackbar).toHaveBeenCalledWith('Failed to fetch audit log');
    });
  });

  describe('cast observable', () => {
    it('should initially emit empty string', () => {
      let emittedValue: string | undefined;

      service.cast.subscribe((value) => {
        emittedValue = value;
      });

      expect(emittedValue).toBe('');
    });

    it('should emit actions when secrets are modified', () => {
      const emittedValues: string[] = [];

      service.cast.subscribe((value) => {
        emittedValues.push(value);
      });

      // Create a secret
      service.createSecret({ slug: 'test', value: 'value' }).subscribe();
      const createReq = httpMock.expectOne('/secrets');
      createReq.flush(mockSecret);

      // Update a secret
      service.updateSecret('test', { value: 'new-value' }).subscribe();
      const updateReq = httpMock.expectOne('/secrets/test');
      updateReq.flush(mockSecret);

      // Delete a secret
      service.deleteSecret('test').subscribe();
      const deleteReq = httpMock.expectOne('/secrets/test');
      deleteReq.flush(mockDeleteResponse);

      expect(emittedValues).toEqual(['', 'created', 'updated', 'deleted']);
    });
  });
});
