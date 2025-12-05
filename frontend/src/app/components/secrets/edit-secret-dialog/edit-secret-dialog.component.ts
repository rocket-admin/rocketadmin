import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret, SecretWithValue } from 'src/app/models/secret';

@Component({
  selector: 'app-edit-secret-dialog',
  templateUrl: './edit-secret-dialog.component.html',
  styleUrls: ['./edit-secret-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ]
})
export class EditSecretDialogComponent implements OnInit {
  public form: FormGroup;
  public loading = true;
  public submitting = false;
  public showValue = false;
  public requiresMasterPassword = false;
  public masterPassword = '';
  public masterPasswordError = '';
  public showMasterPassword = false;
  public currentSecret: SecretWithValue | null = null;
  public clearExpiration = false;
  public minDate = new Date();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditSecretDialogComponent>,
    private _secrets: SecretsService,
    private angulartics2: Angulartics2
  ) {
    this.form = this.fb.group({
      value: ['', [Validators.required, Validators.maxLength(10000)]],
      expiresAt: [null],
    });
  }

  ngOnInit(): void {
    this.loadSecret();
  }

  loadSecret(masterPassword?: string): void {
    this.loading = true;
    this.masterPasswordError = '';

    this._secrets.getSecret(this.data.secret.slug, masterPassword).subscribe({
      next: (secret) => {
        this.currentSecret = secret;
        this.form.patchValue({
          value: secret.value,
          expiresAt: secret.expiresAt ? new Date(secret.expiresAt) : null,
        });
        this.loading = false;
        this.requiresMasterPassword = false;
        this.masterPassword = masterPassword || '';
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) {
          this.requiresMasterPassword = true;
          if (masterPassword) {
            this.masterPasswordError = 'Invalid master password';
          }
        }
      }
    });
  }

  submitMasterPassword(): void {
    if (!this.masterPassword) {
      this.masterPasswordError = 'Please enter the master password';
      return;
    }
    this.loadSecret(this.masterPassword);
  }

  toggleValueVisibility(): void {
    this.showValue = !this.showValue;
  }

  toggleMasterPasswordVisibility(): void {
    this.showMasterPassword = !this.showMasterPassword;
  }

  get valueError(): string {
    const control = this.form.get('value');
    if (control?.hasError('required')) return 'Value is required';
    if (control?.hasError('maxlength')) return 'Value must be 10000 characters or less';
    return '';
  }

  onClearExpirationChange(checked: boolean): void {
    this.clearExpiration = checked;
    if (checked) {
      this.form.get('expiresAt')?.disable();
    } else {
      this.form.get('expiresAt')?.enable();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    const formValue = this.form.getRawValue();

    const payload = {
      value: formValue.value,
      expiresAt: this.clearExpiration
        ? null
        : (formValue.expiresAt ? new Date(formValue.expiresAt).toISOString() : undefined),
    };

    this._secrets.updateSecret(
      this.data.secret.slug,
      payload,
      this.data.secret.masterEncryption ? this.masterPassword : undefined
    ).subscribe({
      next: () => {
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret updated successfully',
        });
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
