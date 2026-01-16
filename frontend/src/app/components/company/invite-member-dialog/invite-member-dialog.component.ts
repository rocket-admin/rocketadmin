import { NgForOf, NgIf } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { Angulartics2 } from 'angulartics2';
import { EmailValidationDirective } from 'src/app/directives/emailValidator.directive';
import { CompanyMemberRole } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { environment } from 'src/environments/environment';
import { TurnstileComponent } from '../../ui-components/turnstile/turnstile.component';

@Component({
	selector: 'app-invite-member-dialog',
	templateUrl: './invite-member-dialog.component.html',
	styleUrls: ['./invite-member-dialog.component.css'],
	standalone: true,
	imports: [
		NgIf,
		NgForOf,
		FormsModule,
		MatDialogModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatButtonModule,
		MatMenuModule,
		MatIconModule,
		EmailValidationDirective,
		TurnstileComponent,
	],
})
export class InviteMemberDialogComponent {
	@ViewChild(TurnstileComponent) turnstileWidget: TurnstileComponent;

	CompanyMemberRole = CompanyMemberRole;

	public isSaas = (environment as any).saas;
	public turnstileToken: string | null = null;
	public companyMemberEmail: string;
	public companyMemberRole: CompanyMemberRole = CompanyMemberRole.Member;
	public submitting: boolean = false;
	public companyUsersGroup: string = null;
	public groups: {
		title: string;
		groups: object[];
	}[] = [];

	public companyRolesName = {
		ADMIN: 'Account Owner',
		DB_ADMIN: 'System Admin',
		USER: 'Member',
	};

	constructor(
		@Inject(MAT_DIALOG_DATA) public company: any,
		public dialogRef: MatDialogRef<InviteMemberDialogComponent>,
		private _company: CompanyService,
		private angulartics2: Angulartics2,
	) {}

	ngOnInit(): void {
		this.groups = this.company.connections.sort((a, b) => a.isTestConnection - b.isTestConnection);
	}

	addCompanyMember() {
		this.submitting = true;
		this._company
			.inviteCompanyMember(
				this.company.id,
				this.companyUsersGroup,
				this.companyMemberEmail,
				this.companyMemberRole,
				this.isSaas ? this.turnstileToken : null,
			)
			.subscribe(
				() => {
					this.angulartics2.eventTrack.next({
						action: 'Company: member is invited successfully',
					});

					this.submitting = false;
					this.dialogRef.close();
				},
				() => {
					this._resetTurnstile();
				},
				() => {
					this.submitting = false;
				},
			);
	}

	onTurnstileToken(token: string) {
		this.turnstileToken = token;
	}

	onTurnstileError() {
		this.turnstileToken = null;
	}

	onTurnstileExpired() {
		this.turnstileToken = null;
	}

	private _resetTurnstile(): void {
		if (this.isSaas && this.turnstileWidget) {
			this.turnstileWidget.reset();
			this.turnstileToken = null;
		}
	}
}
