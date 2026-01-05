import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';
import { Secret } from 'src/app/models/secret';

@Component({
  selector: 'app-delete-secret-dialog',
  templateUrl: './delete-secret-dialog.component.html',
  styleUrls: ['./delete-secret-dialog.component.css'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ]
})
export class DeleteSecretDialogComponent {
  public submitting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { secret: Secret },
    private dialogRef: MatDialogRef<DeleteSecretDialogComponent>,
    private _secrets: SecretsService,
    private angulartics2: Angulartics2
  ) {}

  onDelete(): void {
    this.submitting = true;
    this._secrets.deleteSecret(this.data.secret.slug).subscribe({
      next: () => {
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret deleted successfully',
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
