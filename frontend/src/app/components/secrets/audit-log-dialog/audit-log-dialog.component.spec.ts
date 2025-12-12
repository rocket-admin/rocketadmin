import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';

import { AuditLogDialogComponent } from './audit-log-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, AuditLogEntry, AuditLogResponse } from 'src/app/models/secret';

describe('AuditLogDialogComponent', () => {
  let component: AuditLogDialogComponent;
  let fixture: ComponentFixture<AuditLogDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AuditLogDialogComponent>>;

  const mockSecret: Secret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  const mockAuditLogEntry: AuditLogEntry = {
    id: '1',
    action: 'create',
    user: { id: '1', email: 'user@example.com' },
    accessedAt: '2024-01-01T00:00:00Z',
    success: true,
  };

  const mockAuditLogResponse: AuditLogResponse = {
    data: [mockAuditLogEntry],
    pagination: { total: 1, currentPage: 1, perPage: 20, lastPage: 1 },
  };

  const mockMultipleLogsResponse: AuditLogResponse = {
    data: [
      mockAuditLogEntry,
      {
        id: '2',
        action: 'view',
        user: { id: '2', email: 'viewer@example.com' },
        accessedAt: '2024-01-02T00:00:00Z',
        success: true,
      },
      {
        id: '3',
        action: 'update',
        user: { id: '1', email: 'user@example.com' },
        accessedAt: '2024-01-03T00:00:00Z',
        success: true,
      },
      {
        id: '4',
        action: 'copy',
        user: { id: '3', email: 'copier@example.com' },
        accessedAt: '2024-01-04T00:00:00Z',
        success: true,
      },
      {
        id: '5',
        action: 'delete',
        user: { id: '1', email: 'user@example.com' },
        accessedAt: '2024-01-05T00:00:00Z',
        success: false,
        errorMessage: 'Deletion failed',
      },
    ],
    pagination: { total: 5, currentPage: 1, perPage: 20, lastPage: 1 },
  };

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['getAuditLog']);
    mockSecretsService.getAuditLog.and.returnValue(of(mockAuditLogResponse));

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        AuditLogDialogComponent,
        BrowserAnimationsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { secret: mockSecret } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should load audit log on init', () => {
      expect(mockSecretsService.getAuditLog).toHaveBeenCalledWith('test-secret', 1, 20);
    });

    it('should display audit log entries', () => {
      expect(component.logs.length).toBe(1);
      expect(component.logs[0].action).toBe('create');
    });

    it('should initialize with default pagination', () => {
      expect(component.pagination).toEqual({
        total: 1,
        currentPage: 1,
        perPage: 20,
        lastPage: 1
      });
    });

    it('should initialize loading as false after load', () => {
      expect(component.loading).toBeFalse();
    });

    it('should have correct displayed columns', () => {
      expect(component.displayedColumns).toEqual(['action', 'user', 'accessedAt', 'success']);
    });
  });

  describe('action labels', () => {
    it('should have label for create action', () => {
      expect(component.actionLabels['create']).toBe('Created');
    });

    it('should have label for view action', () => {
      expect(component.actionLabels['view']).toBe('Viewed');
    });

    it('should have label for copy action', () => {
      expect(component.actionLabels['copy']).toBe('Copied');
    });

    it('should have label for update action', () => {
      expect(component.actionLabels['update']).toBe('Updated');
    });

    it('should have label for delete action', () => {
      expect(component.actionLabels['delete']).toBe('Deleted');
    });
  });

  describe('action icons', () => {
    it('should have icon for create action', () => {
      expect(component.actionIcons['create']).toBe('add_circle');
    });

    it('should have icon for view action', () => {
      expect(component.actionIcons['view']).toBe('visibility');
    });

    it('should have icon for copy action', () => {
      expect(component.actionIcons['copy']).toBe('content_copy');
    });

    it('should have icon for update action', () => {
      expect(component.actionIcons['update']).toBe('edit');
    });

    it('should have icon for delete action', () => {
      expect(component.actionIcons['delete']).toBe('delete');
    });
  });

  describe('action colors', () => {
    it('should have color for create action', () => {
      expect(component.actionColors['create']).toBe('primary');
    });

    it('should have color for view action', () => {
      expect(component.actionColors['view']).toBe('accent');
    });

    it('should have color for copy action', () => {
      expect(component.actionColors['copy']).toBe('accent');
    });

    it('should have color for update action', () => {
      expect(component.actionColors['update']).toBe('primary');
    });

    it('should have color for delete action', () => {
      expect(component.actionColors['delete']).toBe('warn');
    });
  });

  describe('loadAuditLog', () => {
    it('should set loading to true while fetching', () => {
      component.loading = false;
      mockSecretsService.getAuditLog.and.returnValue(of(mockAuditLogResponse));

      component.loadAuditLog();

      expect(component.loading).toBeFalse();
    });

    it('should update logs on successful fetch', () => {
      mockSecretsService.getAuditLog.and.returnValue(of(mockMultipleLogsResponse));

      component.loadAuditLog();

      expect(component.logs.length).toBe(5);
    });

    it('should update pagination on successful fetch', () => {
      mockSecretsService.getAuditLog.and.returnValue(of(mockMultipleLogsResponse));

      component.loadAuditLog();

      expect(component.pagination.total).toBe(5);
    });

    it('should call getAuditLog with current pagination', () => {
      mockSecretsService.getAuditLog.calls.reset();
      component.pagination.currentPage = 2;
      component.pagination.perPage = 10;

      component.loadAuditLog();

      expect(mockSecretsService.getAuditLog).toHaveBeenCalledWith('test-secret', 2, 10);
    });
  });

  describe('onPageChange', () => {
    it('should update pagination and reload audit log', () => {
      const pageEvent: PageEvent = {
        pageIndex: 2,
        pageSize: 50,
        length: 100
      };

      mockSecretsService.getAuditLog.calls.reset();
      component.onPageChange(pageEvent);

      expect(component.pagination.currentPage).toBe(3);
      expect(component.pagination.perPage).toBe(50);
      expect(mockSecretsService.getAuditLog).toHaveBeenCalledWith('test-secret', 3, 50);
    });

    it('should handle first page correctly', () => {
      const pageEvent: PageEvent = {
        pageIndex: 0,
        pageSize: 20,
        length: 100
      };

      mockSecretsService.getAuditLog.calls.reset();
      component.onPageChange(pageEvent);

      expect(component.pagination.currentPage).toBe(1);
    });
  });

  describe('with multiple audit log entries', () => {
    beforeEach(() => {
      mockSecretsService.getAuditLog.and.returnValue(of(mockMultipleLogsResponse));
      component.loadAuditLog();
    });

    it('should display all entries', () => {
      expect(component.logs.length).toBe(5);
    });

    it('should include failed actions', () => {
      const failedAction = component.logs.find(log => !log.success);
      expect(failedAction).toBeTruthy();
      expect(failedAction?.errorMessage).toBe('Deletion failed');
    });

    it('should include all action types', () => {
      const actions = component.logs.map(log => log.action);
      expect(actions).toContain('create');
      expect(actions).toContain('view');
      expect(actions).toContain('update');
      expect(actions).toContain('copy');
      expect(actions).toContain('delete');
    });
  });

  describe('data binding', () => {
    it('should have access to secret data', () => {
      expect(component.data.secret).toEqual(mockSecret);
    });

    it('should have access to secret slug', () => {
      expect(component.data.secret.slug).toBe('test-secret');
    });
  });
});
