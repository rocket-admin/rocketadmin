import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';

import { AuditLogDialogComponent } from './audit-log-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';

describe('AuditLogDialogComponent', () => {
  let component: AuditLogDialogComponent;
  let fixture: ComponentFixture<AuditLogDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<AuditLogDialogComponent>>;

  const mockSecret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['getAuditLog']);
    mockSecretsService.getAuditLog.and.returnValue(of({
      data: [
        {
          id: '1',
          action: 'create',
          user: { id: '1', email: 'user@example.com' },
          accessedAt: '2024-01-01T00:00:00Z',
          success: true,
        },
      ],
      pagination: { total: 1, currentPage: 1, perPage: 20, lastPage: 1 },
    }));

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

  it('should load audit log on init', () => {
    expect(mockSecretsService.getAuditLog).toHaveBeenCalledWith('test-secret', 1, 20);
  });

  it('should display audit log entries', () => {
    expect(component.logs.length).toBe(1);
    expect(component.logs[0].action).toBe('create');
  });

  it('should have action labels', () => {
    expect(component.actionLabels['create']).toBe('Created');
    expect(component.actionLabels['view']).toBe('Viewed');
    expect(component.actionLabels['delete']).toBe('Deleted');
  });
});
