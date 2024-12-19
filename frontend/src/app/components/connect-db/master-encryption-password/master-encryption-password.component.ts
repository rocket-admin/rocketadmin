import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { Angulartics2Module } from 'angulartics2';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from 'src/app/services/connections.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-master-encryption-password',
  templateUrl: './master-encryption-password.component.html',
  styleUrl: './master-encryption-password.component.css',
  imports: [
    CommonModule,
    FormsModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ClipboardModule,
    Angulartics2Module
  ]
})
export class MasterEncryptionPasswordComponent implements OnInit {
  @Input() disabled: boolean;
  @Input() masterKey: string;
  // @Input() isMasterKeyTurnedOn: boolean;

  @Output() onMasterKeyChange = new EventEmitter<string>();
  // @Output() onMasterKeyToggle = new EventEmitter<boolean>();

  public isMasterKeyTurnedOn: boolean = false;

  constructor(
    private _connections: ConnectionsService,
    private _notifications: NotificationsService,
  ) { }

  ngOnInit() {
    this.isMasterKeyTurnedOn = this._connections.currentConnection.masterEncryption;
  }

  generatePassword (checked: boolean) {
    if (checked) {
      let randomArray = new Uint8Array(32);
      window.crypto.getRandomValues(randomArray);
      this.masterKey = btoa(String.fromCharCode(...randomArray));

      this.onMasterKeyChange.emit(this.masterKey);
    }
    // this.onMasterKeyToggle.emit(checked);
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
