import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';

import { EditSecretDialogComponent } from './edit-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';

describe('EditSecretDialogComponent', () => {
  let component: EditSecretDialogComponent;
  let fixture: ComponentFixture<EditSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<EditSecretDialogComponent>>;

  const mockSecret = {
    id: '1',
    slug: 'test-secret',
    companyId: '1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    masterEncryption: false,
  };

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['updateSecret']);
    mockSecretsService.updateSecret.and.returnValue(of(mockSecret));

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
        { provide: MAT_DIALOG_DATA, useValue: { secret: mockSecret } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditSecretDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty value', () => {
    expect(component.form.get('value')?.value).toBe('');
  });

  it('should submit updated secret', () => {
    component.form.patchValue({ value: 'new-value' });
    component.onSubmit();
    expect(mockSecretsService.updateSecret).toHaveBeenCalled();
  });

  it('should require value field', () => {
    expect(component.form.get('value')?.valid).toBeFalse();
    component.form.patchValue({ value: 'some-value' });
    expect(component.form.get('value')?.valid).toBeTrue();
  });
});
