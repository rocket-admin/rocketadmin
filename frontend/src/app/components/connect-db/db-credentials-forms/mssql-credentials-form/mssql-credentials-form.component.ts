import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Connection } from 'src/app/models/connection';

@Component({
  selector: 'app-mssql-credentials-form',
  templateUrl: './mssql-credentials-form.component.html',
  styleUrls: ['./../credential-form-grid.css', './mssql-credentials-form.component.css']
})
export class MssqlCredentialsFormComponent {
  @Input() connection: Connection;
  @Input() readonly: boolean;
  @Input() submitting: boolean;
  @Input() masterKey: string;
  @Input() isMasterKeyTurnedOn: boolean;
  @Input() accessLevel: string;

  @Output() switchToAgent = new EventEmitter<void>();
  @Output() masterKeyChange = new EventEmitter<string>();
  @Output() masterKeyToggle = new EventEmitter<boolean>();

  handleMasterKeyChange(newMasterKey: string): void {
    this.masterKeyChange.emit(newMasterKey);
  }

  handleMasterKeyToggle(isTurnedOn: boolean): void {
    this.masterKeyToggle.emit(isTurnedOn);
  }
}
