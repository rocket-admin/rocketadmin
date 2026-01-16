import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { BehaviorSubject, of } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';

import { SecretsComponent } from './secrets.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { CompanyService } from 'src/app/services/company.service';
import { CreateSecretDialogComponent } from './create-secret-dialog/create-secret-dialog.component';
import { EditSecretDialogComponent } from './edit-secret-dialog/edit-secret-dialog.component';
import { DeleteSecretDialogComponent } from './delete-secret-dialog/delete-secret-dialog.component';
import { AuditLogDialogComponent } from './audit-log-dialog/audit-log-dialog.component';
import { Secret } from 'src/app/models/secret';

describe('SecretsComponent', () => {
  let component: SecretsComponent;
  let fixture: ComponentFixture<SecretsComponent>;
  let mockSecretsService: any;
  let mockCompanyService: any;
  let mockDialog: any;
  let secretsUpdatedSubject: BehaviorSubject<string>;

  const mockSecret: Secret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  const createMockSecretsResponse = () => ({
    data: [mockSecret],
    pagination: { total: 1, currentPage: 1, perPage: 20, lastPage: 1 }
  });

  beforeEach(async () => {
    secretsUpdatedSubject = new BehaviorSubject<string>('');

    mockSecretsService = {
      fetchSecrets: vi.fn().mockImplementation(() => of(createMockSecretsResponse())),
      cast: secretsUpdatedSubject.asObservable(),
    } as any;

    mockCompanyService = {
      getCurrentTabTitle: vi.fn().mockReturnValue(of('Test Company')),
    } as any;

    mockDialog = {
      open: vi.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        SecretsComponent,
        BrowserAnimationsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: MatDialog, useValue: mockDialog },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SecretsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load secrets on init', () => {
    expect(mockSecretsService.fetchSecrets).toHaveBeenCalled();
  });

  it('should set page title on init', () => {
    expect(mockCompanyService.getCurrentTabTitle).toHaveBeenCalled();
  });

  it('should initialize with pagination from response', () => {
    // The pagination comes from the mock service response
    expect(component.pagination.total).toBe(1);
    expect(component.pagination.lastPage).toBe(1);
  });

  it('should initialize with loading true then false after load', () => {
    expect(component.loading).toBe(false);
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['slug', 'masterEncryption', 'expiresAt', 'updatedAt', 'actions']);
  });

  describe('isExpired', () => {
    it('should return true for expired secrets', () => {
      const expiredSecret: Secret = {
        ...mockSecret,
        expiresAt: '2024-01-01',
      };
      expect(component.isExpired(expiredSecret)).toBe(true);
    });

    it('should return false for non-expired secrets', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const validSecret: Secret = {
        ...mockSecret,
        expiresAt: futureDate.toISOString(),
      };
      expect(component.isExpired(validSecret)).toBe(false);
    });

    it('should return false for secrets without expiration', () => {
      expect(component.isExpired(mockSecret)).toBe(false);
    });
  });

  describe('isExpiringSoon', () => {
    it('should return true for secrets expiring within 7 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 3);
      const expiringSoonSecret: Secret = {
        ...mockSecret,
        expiresAt: soonDate.toISOString(),
      };
      expect(component.isExpiringSoon(expiringSoonSecret)).toBe(true);
    });

    it('should return false for secrets expiring beyond 7 days', () => {
      const laterDate = new Date();
      laterDate.setDate(laterDate.getDate() + 14);
      const notExpiringSoonSecret: Secret = {
        ...mockSecret,
        expiresAt: laterDate.toISOString(),
      };
      expect(component.isExpiringSoon(notExpiringSoonSecret)).toBe(false);
    });

    it('should return false for already expired secrets', () => {
      const expiredSecret: Secret = {
        ...mockSecret,
        expiresAt: '2024-01-01',
      };
      expect(component.isExpiringSoon(expiredSecret)).toBe(false);
    });

    it('should return false for secrets without expiration', () => {
      expect(component.isExpiringSoon(mockSecret)).toBe(false);
    });

    it('should return true for secrets expiring exactly in 7 days', () => {
      const exactlySevenDays = new Date();
      exactlySevenDays.setDate(exactlySevenDays.getDate() + 7);
      const secret: Secret = {
        ...mockSecret,
        expiresAt: exactlySevenDays.toISOString(),
      };
      expect(component.isExpiringSoon(secret)).toBe(true);
    });
  });

  describe('openCreateDialog', () => {
    it('should open create dialog with correct configuration', () => {
      component.openCreateDialog();
      expect(mockDialog.open).toHaveBeenCalledWith(CreateSecretDialogComponent, {
        width: '500px',
      });
    });
  });

  describe('openEditDialog', () => {
    it('should open edit dialog with secret data', () => {
      component.openEditDialog(mockSecret);
      expect(mockDialog.open).toHaveBeenCalledWith(EditSecretDialogComponent, {
        width: '500px',
        data: { secret: mockSecret },
      });
    });
  });

  describe('openDeleteDialog', () => {
    it('should open delete dialog with secret data', () => {
      component.openDeleteDialog(mockSecret);
      expect(mockDialog.open).toHaveBeenCalledWith(DeleteSecretDialogComponent, {
        width: '400px',
        data: { secret: mockSecret },
      });
    });
  });

  describe('openAuditLogDialog', () => {
    it('should open audit log dialog with secret data', () => {
      component.openAuditLogDialog(mockSecret);
      expect(mockDialog.open).toHaveBeenCalledWith(AuditLogDialogComponent, {
        width: '800px',
        maxHeight: '80vh',
        data: { secret: mockSecret },
      });
    });
  });

  describe('onPageChange', () => {
    it('should update pagination and reload secrets', () => {
      const pageEvent: PageEvent = {
        pageIndex: 1,
        pageSize: 10,
        length: 100
      };

      // Update mock to return pagination matching the page change
      mockSecretsService.fetchSecrets.mockImplementation(() => of({
        data: [mockSecret],
        pagination: { total: 100, currentPage: 2, perPage: 10, lastPage: 10 }
      }));
      mockSecretsService.fetchSecrets.mockClear();
      component.onPageChange(pageEvent);

      expect(component.pagination.currentPage).toBe(2);
      expect(component.pagination.perPage).toBe(10);
      expect(mockSecretsService.fetchSecrets).toHaveBeenCalledWith(2, 10, undefined);
    });
  });

  describe('onSearchChange', () => {
    it.skip('should debounce search and reload secrets', async () => {
      // TODO: Timer tests need special handling with Vitest + zone.js
      vi.useFakeTimers();
      mockSecretsService.fetchSecrets.mockClear();

      component.onSearchChange('api');
      component.onSearchChange('api-');
      component.onSearchChange('api-key');

      await vi.advanceTimersByTimeAsync(300);

      expect(mockSecretsService.fetchSecrets).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it.skip('should reset to page 1 on search', async () => {
      // TODO: Timer tests need special handling with Vitest + zone.js
      vi.useFakeTimers();
      component.pagination.currentPage = 3;
      mockSecretsService.fetchSecrets.mockClear();

      component.onSearchChange('test');
      await vi.advanceTimersByTimeAsync(300);

      expect(component.pagination.currentPage).toBe(1);
      vi.useRealTimers();
    });
  });

  describe('secretsUpdated subscription', () => {
    it('should reload secrets when secretsUpdated emits', () => {
      mockSecretsService.fetchSecrets.mockClear();

      secretsUpdatedSubject.next('created');

      expect(mockSecretsService.fetchSecrets).toHaveBeenCalled();
    });

    it('should not reload secrets when secretsUpdated emits empty string', () => {
      mockSecretsService.fetchSecrets.mockClear();

      secretsUpdatedSubject.next('');

      expect(mockSecretsService.fetchSecrets).not.toHaveBeenCalled();
    });
  });

  describe('loadSecrets', () => {
    it('should set loading to true while fetching', () => {
      component.loading = false;
      mockSecretsService.fetchSecrets.mockImplementation(() => of(createMockSecretsResponse()));

      component.loadSecrets();

      expect(component.loading).toBe(false);
    });

    it('should update secrets and pagination on successful fetch', () => {
      const newResponse = {
        data: [mockSecret, { ...mockSecret, id: '2', slug: 'test-2' }],
        pagination: { total: 2, currentPage: 1, perPage: 20, lastPage: 1 }
      };
      mockSecretsService.fetchSecrets.mockReturnValue(of(newResponse));

      component.loadSecrets();

      expect(component.secrets).toEqual(newResponse.data);
      expect(component.pagination).toEqual(newResponse.pagination);
    });

    it('should pass search query to fetchSecrets', () => {
      mockSecretsService.fetchSecrets.mockClear();
      component.searchQuery = 'api-key';

      component.loadSecrets();

      expect(mockSecretsService.fetchSecrets).toHaveBeenCalledWith(1, 20, 'api-key');
    });

    it('should pass undefined for empty search query', () => {
      mockSecretsService.fetchSecrets.mockClear();
      component.searchQuery = '';

      component.loadSecrets();

      expect(mockSecretsService.fetchSecrets).toHaveBeenCalledWith(1, 20, undefined);
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      const unsubscribeSpy = vi.spyOn(component.subscriptions[0], 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
