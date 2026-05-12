import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Connection } from 'src/app/models/connection';

@Component({
	selector: 'app-base-credentials-form',
	templateUrl: './base-credentials-form.component.html',
	styleUrl: './base-credentials-form.component.css',
})
export class BaseCredentialsFormComponent {
	@Input() connection: Connection;
	@Input() readonly: boolean;
	@Input() submitting: boolean;
	@Input() masterKey: string;
	@Input() accessLevel: string;
	@Input() autoFilledFields: Set<string> = new Set();

	@Output() switchToAgent = new EventEmitter<void>();
	@Output() masterKeyChange = new EventEmitter<string>();
	@Output() fieldChange = new EventEmitter<string>();

	public tunnelingServiceLink = 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection/create_pinggy';

	handleMasterKeyChange(newMasterKey: string): void {
		this.masterKeyChange.emit(newMasterKey);
	}

	clearAutoFilled(field: string): void {
		this.fieldChange.emit(field);
	}
}
