import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { Title } from '@angular/platform-browser';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { UserService } from 'src/app/services/user.service';
import { CompanyService } from 'src/app/services/company.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { ApiKey } from 'src/app/models/user';
import { ApiKeyDeleteDialogComponent } from '../user-settings/api-key-delete-dialog/api-key-delete-dialog.component';

@Component({
  selector: 'app-api-keys',
  templateUrl: './api-keys.component.html',
  styleUrls: ['./api-keys.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    CdkCopyToClipboard,
    Angulartics2OnModule,
    AlertComponent,
    ProfileSidebarComponent,
  ]
})
export class ApiKeysComponent implements OnInit {
  public apiKeys: ApiKey[] = [];
  public generatingAPIkeyTitle: string = '';
  public generatedAPIkeyHash: string = '';
  public submitting: boolean = false;

  constructor(
    private _userService: UserService,
    private _company: CompanyService,
    private _notifications: NotificationsService,
    private dialog: MatDialog,
    private title: Title,
    private angulartics2: Angulartics2,
  ) {}

  ngOnInit(): void {
    this._company.getCurrentTabTitle().subscribe(tabTitle => {
      this.title.setTitle(`API Keys | ${tabTitle || 'Rocketadmin'}`);
    });
    this.getAPIkeys();
  }

  getAPIkeys() {
    this._userService.getAPIkeys().subscribe(res => this.apiKeys = res);
  }

  generateAPIkey() {
    this.submitting = true;
    this._userService.generateAPIkey(this.generatingAPIkeyTitle).subscribe(res => {
      this.generatedAPIkeyHash = res.hash;
      this.generatingAPIkeyTitle = '';
      this.getAPIkeys();
      this.submitting = false;
      this.angulartics2.eventTrack.next({
        action: 'API Keys: key generated successfully',
      });
    }, () => {
      this.submitting = false;
    });
  }

  deleteAPIkey(apiKey: ApiKey) {
    const deleteConfirmation = this.dialog.open(ApiKeyDeleteDialogComponent, {
      width: '25em',
      data: apiKey
    });

    deleteConfirmation.afterClosed().subscribe(action => {
      if (action === 'delete') {
        this.getAPIkeys();
        this.angulartics2.eventTrack.next({
          action: 'API Keys: key deleted successfully',
        });
      }
    });
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
