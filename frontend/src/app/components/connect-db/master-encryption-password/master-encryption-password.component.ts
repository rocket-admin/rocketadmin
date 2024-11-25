import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConnectionsService } from 'src/app/services/connections.service';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-master-encryption-password',
  templateUrl: './master-encryption-password.component.html',
  styleUrl: './master-encryption-password.component.css'
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
