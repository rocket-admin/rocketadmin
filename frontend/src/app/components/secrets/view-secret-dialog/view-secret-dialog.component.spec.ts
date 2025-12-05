import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';

import { ViewSecretDialogComponent } from './view-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';
import { NotificationsService } from 'src/app/services/notifications.service';

describe('ViewSecretDialogComponent', () => {
  let component: ViewSecretDialogComponent;
  let fixture: ComponentFixture<ViewSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockNotificationsService: jasmine.SpyObj<NotificationsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewSecretDialogComponent>>;

  const mockSecret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['getSecret']);
    mockSecretsService.getSecret.and.returnValue(of({
      ...mockSecret,
      value: 'secret-value',
    }));

    mockNotificationsService = jasmine.createSpyObj('NotificationsService', ['showSuccessSnackbar']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        ViewSecretDialogComponent,
        BrowserAnimationsModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { secret: mockSecret } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewSecretDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load secret on init', () => {
    expect(mockSecretsService.getSecret).toHaveBeenCalledWith('test-secret', undefined);
  });

  it('should toggle value visibility', () => {
    expect(component.showValue).toBeFalse();
    component.toggleValueVisibility();
    expect(component.showValue).toBeTrue();
  });

  it('should copy to clipboard', () => {
    component.secret = { ...mockSecret, value: 'secret-value' };
    component.copyToClipboard();
    expect(mockNotificationsService.showSuccessSnackbar).toHaveBeenCalledWith('Secret copied to clipboard');
  });
});
