import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';

import { SecretsComponent } from './secrets.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { CompanyService } from 'src/app/services/company.service';

describe('SecretsComponent', () => {
  let component: SecretsComponent;
  let fixture: ComponentFixture<SecretsComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockCompanyService: jasmine.SpyObj<CompanyService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['fetchSecrets'], {
      cast: of('')
    });
    mockSecretsService.fetchSecrets.and.returnValue(of({
      data: [],
      pagination: { total: 0, currentPage: 1, perPage: 20, lastPage: 1 }
    }));

    mockCompanyService = jasmine.createSpyObj('CompanyService', ['getCurrentTabTitle']);
    mockCompanyService.getCurrentTabTitle.and.returnValue(of('Test Company'));

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

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

  it('should detect expired secrets', () => {
    const expiredSecret = {
      id: '1',
      slug: 'test',
      companyId: '1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      expiresAt: '2024-01-01',
      masterEncryption: false,
    };
    expect(component.isExpired(expiredSecret)).toBeTrue();
  });

  it('should detect non-expired secrets', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const validSecret = {
      id: '1',
      slug: 'test',
      companyId: '1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      expiresAt: futureDate.toISOString(),
      masterEncryption: false,
    };
    expect(component.isExpired(validSecret)).toBeFalse();
  });

  it('should detect secrets expiring soon', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    const expiringSoonSecret = {
      id: '1',
      slug: 'test',
      companyId: '1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      expiresAt: soonDate.toISOString(),
      masterEncryption: false,
    };
    expect(component.isExpiringSoon(expiringSoonSecret)).toBeTrue();
  });

  it('should open create dialog', () => {
    component.openCreateDialog();
    expect(mockDialog.open).toHaveBeenCalled();
  });
});
