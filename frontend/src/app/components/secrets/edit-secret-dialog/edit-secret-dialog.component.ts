import { Component, Inject } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret } from 'src/app/models/secret';

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
    MatTooltipModule,
  ]
})
export class EditSecretDialogComponent {
  public form: FormGroup;
  public submitting = false;
  public showValue = false;
  public masterPassword = '';
  public masterPasswordError = '';
  public showMasterPassword = false;
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
      expiresAt: [data.secret.expiresAt ? new Date(data.secret.expiresAt) : null],
    });
  }

  toggleValueVisibility(): void {
    this.showValue = !this.showValue;
  }

  toggleMasterPasswordVisibility(): void {
    this.showMasterPassword = !this.showMasterPassword;
  }

  get valueError(): string {
    const control = this.form.get('value');
    if (control?.hasError('required')) return 'New value is required';
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

    if (this.data.secret.masterEncryption && !this.masterPassword) {
      this.masterPasswordError = 'Master password is required';
      return;
    }

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
      error: (err) => {
        this.submitting = false;
        if (err.status === 403) {
          this.masterPasswordError = 'Invalid master password';
        }
      }
    });
  }
}
