import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { Secret, SecretWithValue } from 'src/app/models/secret';

@Component({
  selector: 'app-view-secret-dialog',
  templateUrl: './view-secret-dialog.component.html',
  styleUrls: ['./view-secret-dialog.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ]
})
export class ViewSecretDialogComponent implements OnInit {
  public secret: SecretWithValue | null = null;
  public loading = true;
  public showValue = false;
  public requiresMasterPassword = false;
  public masterPassword = '';
  public masterPasswordError = '';
  public showMasterPassword = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private dialogRef: MatDialogRef<ViewSecretDialogComponent>,
    private _secrets: SecretsService,
    private _notifications: NotificationsService,
    private clipboard: Clipboard,
    private angulartics2: Angulartics2
  ) {}

  ngOnInit(): void {
    this.loadSecret();
  }

  loadSecret(masterPassword?: string): void {
    this.loading = true;
    this.masterPasswordError = '';

    this._secrets.getSecret(this.data.secret.slug, masterPassword).subscribe({
      next: (secret) => {
        this.secret = secret;
        this.loading = false;
        this.requiresMasterPassword = false;
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret viewed',
        });
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

  copyToClipboard(): void {
    if (this.secret?.value) {
      this.clipboard.copy(this.secret.value);
      this._notifications.showSuccessSnackbar('Secret copied to clipboard');
      this.angulartics2.eventTrack.next({
        action: 'Secrets: secret copied to clipboard',
      });
    }
  }

  isExpired(): boolean {
    if (!this.secret?.expiresAt) return false;
    return new Date(this.secret.expiresAt) < new Date();
  }
}
