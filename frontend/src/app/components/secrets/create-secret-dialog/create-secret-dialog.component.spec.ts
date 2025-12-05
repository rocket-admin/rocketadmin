import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';

import { CreateSecretDialogComponent } from './create-secret-dialog.component';
import { SecretsService } from 'src/app/services/secrets.service';

describe('CreateSecretDialogComponent', () => {
  let component: CreateSecretDialogComponent;
  let fixture: ComponentFixture<CreateSecretDialogComponent>;
  let mockSecretsService: jasmine.SpyObj<SecretsService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CreateSecretDialogComponent>>;

  beforeEach(async () => {
    mockSecretsService = jasmine.createSpyObj('SecretsService', ['createSecret']);
    mockSecretsService.createSecret.and.returnValue(of({
      id: '1',
      slug: 'test',
      companyId: '1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      masterEncryption: false,
    }));

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

  it('should have invalid form initially', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('should validate slug pattern', () => {
    const slugControl = component.form.get('slug');
    slugControl?.setValue('invalid slug!');
    expect(slugControl?.hasError('pattern')).toBeTrue();

    slugControl?.setValue('valid-slug_123');
    expect(slugControl?.hasError('pattern')).toBeFalse();
  });

  it('should require master password when encryption is enabled', () => {
    component.form.get('masterEncryption')?.setValue(true);
    const masterPasswordControl = component.form.get('masterPassword');
    expect(masterPasswordControl?.hasError('required')).toBeTrue();

    masterPasswordControl?.setValue('short');
    expect(masterPasswordControl?.hasError('minlength')).toBeTrue();

    masterPasswordControl?.setValue('validpassword123');
    expect(masterPasswordControl?.valid).toBeTrue();
  });

  it('should submit valid form', () => {
    component.form.patchValue({
      slug: 'test-secret',
      value: 'secret-value',
    });

    component.onSubmit();
    expect(mockSecretsService.createSecret).toHaveBeenCalled();
  });
});
