import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-master-encryption-password',
  templateUrl: './master-encryption-password.component.html',
  styleUrl: './master-encryption-password.component.css'
})
export class MasterEncryptionPasswordComponent {
  @Input() disabled: boolean;
  @Input() masterKey: string;
  @Input() isMasterKeyTurnedOn: boolean;

  @Output() onMasterKeyChange = new EventEmitter<string>();
  @Output() onMasterKeyToggle = new EventEmitter<boolean>();

  constructor(
    private _notifications: NotificationsService,
  ) { }

  generatePassword (checked: boolean) {
    if (checked) {
      let randomArray = new Uint8Array(32);
      window.crypto.getRandomValues(randomArray);
      this.masterKey = btoa(String.fromCharCode(...randomArray));

      this.onMasterKeyChange.emit(this.masterKey);
    }
    this.onMasterKeyToggle.emit(checked);
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
