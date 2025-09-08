import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-sso-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './sso-dialog.component.html',
  styleUrl: './sso-dialog.component.css'
})
export class SsoDialogComponent {
  public companySsoIdentifier: string = '';

  loginWithSSO() {
    window.location.href = `https://app.rocketadmin.com/saas/saml/login-by-slug/${this.companySsoIdentifier}`;
  }
}
