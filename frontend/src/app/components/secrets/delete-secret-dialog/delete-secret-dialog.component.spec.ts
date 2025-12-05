import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';

import { DeleteSecretDialogComponent } from './delete-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';

describe('DeleteSecretDialogComponent', () => {
  let component: DeleteSecretDialogComponent;
  let fixture: ComponentFixture<DeleteSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteSecretDialogComponent>>;

  const mockSecret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['deleteSecret']);
    mockSecretsService.deleteSecret.and.returnValue(of({
      message: 'Secret deleted successfully',
      deletedAt: '2024-01-01',
    }));

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
        { provide: MAT_DIALOG_DATA, useValue: { secret: mockSecret } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteSecretDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call deleteSecret on confirm', () => {
    component.onDelete();
    expect(mockSecretsService.deleteSecret).toHaveBeenCalledWith('test-secret');
  });

  it('should close dialog after successful deletion', () => {
    component.onDelete();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
