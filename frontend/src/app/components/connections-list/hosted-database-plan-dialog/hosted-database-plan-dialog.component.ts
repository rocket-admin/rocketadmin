import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type HostedDatabasePlanChoice = 'free' | 'upgrade';

@Component({
	selector: 'app-hosted-database-plan-dialog',
	templateUrl: './hosted-database-plan-dialog.component.html',
	styleUrl: './hosted-database-plan-dialog.component.css',
	imports: [MatDialogModule, MatButtonModule, MatIconModule],
})
export class HostedDatabasePlanDialogComponent {
	constructor(private _dialogRef: MatDialogRef<HostedDatabasePlanDialogComponent, HostedDatabasePlanChoice>) {}

	chooseFree(): void {
		this._dialogRef.close('free');
	}

	chooseUpgrade(): void {
		this._dialogRef.close('upgrade');
	}
}
