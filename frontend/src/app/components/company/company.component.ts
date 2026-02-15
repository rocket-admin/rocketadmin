import { NgIf } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { orderBy } from 'lodash-es';
import posthog from 'posthog-js';
import { Subscription } from 'rxjs';
import { Company, CompanyMember, CompanyMemberRole } from 'src/app/models/company';
import { SubscriptionPlans } from 'src/app/models/user';
import { CompanyService } from 'src/app/services/company.service';
import { UserService } from 'src/app/services/user.service';
import { environment } from 'src/environments/environment';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { PlaceholderCompanyComponent } from '../skeletons/placeholder-company/placeholder-company.component';
import { PlaceholderTableDataComponent } from '../skeletons/placeholder-table-data/placeholder-table-data.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { DeleteDomainDialogComponent } from './delete-domain-dialog/delete-domain-dialog.component';
import { DeleteMemberDialogComponent } from './delete-member-dialog/delete-member-dialog.component';
import { InviteMemberDialogComponent } from './invite-member-dialog/invite-member-dialog.component';
import { RevokeInvitationDialogComponent } from './revoke-invitation-dialog/revoke-invitation-dialog.component';

@Component({
	selector: 'app-company',
	templateUrl: './company.component.html',
	styleUrls: ['./company.component.css'],
	imports: [
		NgIf,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
		MatIconModule,
		MatSelectModule,
		MatSlideToggleModule,
		MatTooltipModule,
		MatTableModule,
		MatMenuModule,
		RouterModule,
		Angulartics2OnModule,
		AlertComponent,
		PlaceholderCompanyComponent,
		PlaceholderTableDataComponent,
		ProfileSidebarComponent,
	],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CompanyComponent {
	protected posthog = posthog;
	CompanyMemberRole = CompanyMemberRole;
	public isSaas = (environment as any).saas;
	public company: Company = null;
	public members: any = null;
	public currentPlan: string;
	public submitting: boolean;
	public usersCount: number;
	public adminsCount: number;
	public unsuspendedAdminsCount: number;
	public membersTableDisplayedColumns: string[];
	// public invitationsTableDisplayColumns: string[] = ['invitedUserEmail', 'role'];
	public submittingChangedName: boolean = false;
	public currentUser;
	public submittingUsersChange: boolean = false;
	public companyCustomDomain: {
		id: string;
		companyId: string;
		hostname: string;
	} = {
		id: null,
		companyId: '',
		hostname: '',
	};

	public companyCustomDomainHostname: string;
	public companyCustomDomainPlaceholder: string;
	public companyCustomDomainThirdLevel: string;
	public submittingCustomDomain: boolean = false;
	public isCustomDomain: boolean = false;

	public submittingLogo: boolean = false;
	public submittingFavicon: boolean = false;

	public companyTabTitle: string;
	public submittingTabTitle: boolean = false;

	public companyRolesName = {
		ADMIN: 'Account Owner',
		DB_ADMIN: 'System Admin',
		USER: 'Member',
	};

	public authProviderIcons = {
		GOOGLE: 'google',
		GITHUB: 'github',
	};

	get whiteLabelSettings(): { logo: string; favicon: string; tabTitle: string } {
		return this._company.whiteLabelSettings || { logo: '', favicon: '', tabTitle: '' };
	}

	get isDemo() {
		return this._user.isDemo;
	}

	private getTitleSubscription: Subscription;

	constructor(
		public _company: CompanyService,
		public _user: UserService,
		public dialog: MatDialog,
		private angulartics2: Angulartics2,
		private title: Title,
	) {}

	ngOnInit() {
		this.isCustomDomain = this._company.isCustomDomain() && this.isSaas;

		this.getTitleSubscription = this._company.getCurrentTabTitle().subscribe((title) => {
			this.companyTabTitle = title;
			this.title.setTitle(`Company settings | ${title || 'Rocketadmin'}`);
		});

		this._company.fetchCompany().subscribe((res) => {
			this.company = res;
			this.setCompanyPlan(res.subscriptionLevel);
			this.getCompanyMembers(res.id);
			if (this.isCustomDomain) {
				this.companyCustomDomainHostname = res.custom_domain;
			} else {
				this.getCompanyCustomDomain(res.id);
			}
		});

		this._company.cast.subscribe((arg) => {
			if (arg === 'invited' || arg === 'revoked' || arg === 'role' || arg === 'suspended' || arg === 'unsuspended') {
				this.submittingUsersChange = true;
				this._company.fetchCompany().subscribe((res) => {
					this.company = res;
					this.getCompanyMembers(res.id);
					this.submittingUsersChange = false;
				});
			} else if (arg === 'deleted') {
				this.submittingUsersChange = true;
				this.getCompanyMembers(this.company.id);
			} else if (arg === 'domain') {
				this.getCompanyCustomDomain(this.company.id);
			} else if (arg === 'updated-white-label-settings') {
				// this.submittingLogo = true;
				this._company.getWhiteLabelProperties(this.company.id).subscribe();
			}
		});
	}

	ngOnDestroy() {
		if (this.getTitleSubscription) {
			this.getTitleSubscription.unsubscribe();
		}
	}

	getCompanyMembers(companyId: string) {
		this._company.fetchCompanyMembers(companyId).subscribe((res) => {
			if (this.company.invitations) {
				this.company.invitations.map((invitee: any) => {
					invitee.email = invitee.invitedUserEmail;
					invitee.pending = true;
				});
			} else {
				this.company.invitations = [];
			}
			this._user.cast.subscribe((user) => {
				this.currentUser = res.find((member) => member.email === user.email);

				if (this.currentUser.role === 'ADMIN') {
					this.membersTableDisplayedColumns = ['email', 'name', 'role', 'twoFA', 'active', 'access', 'actions'];
				} else {
					this.membersTableDisplayedColumns = ['email', 'name', 'role', 'twoFA', 'access'];
				}

				const currentMembers = orderBy(res, ['role', 'email']);
				if (this.currentUser.role === 'ADMIN') {
					const userIndex = currentMembers.findIndex((user) => user.email === this.currentUser.email);

					if (userIndex !== -1) {
						const user = currentMembers.splice(userIndex, 1)[0];
						currentMembers.unshift(user);
					}
				}

				this.members = [...currentMembers, ...this.company.invitations];
			});
			this.adminsCount = res.filter((user) => user.role === 'ADMIN').length;
			this.unsuspendedAdminsCount = res.filter((user) => user.role === 'ADMIN' && !user.suspended).length;
			this.usersCount = this.company.invitations.length + res.length;
			this.submittingUsersChange = false;
		});
	}

	getCompanyCustomDomain(companyId: string) {
		this._company.getCustomDomain(companyId).subscribe((res) => {
			if (res.success) {
				this.companyCustomDomain = res.domain_info;
				this.companyCustomDomainHostname = res.domain_info.hostname;
				this.companyCustomDomainThirdLevel = this.companyCustomDomainHostname.split('.')[0];
			} else {
				this.companyCustomDomain = {
					id: null,
					companyId: companyId,
					hostname: '',
				};
				this.companyCustomDomainHostname = '';
				this.companyCustomDomainPlaceholder = `${this.company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`;
				this.companyCustomDomainThirdLevel = this.companyCustomDomainPlaceholder.split('.')[0];
			}
		});
	}

	setCompanyPlan(subscriptionLevel: SubscriptionPlans) {
		if (subscriptionLevel) {
			this.currentPlan = subscriptionLevel;
			this.currentPlan = this.currentPlan.slice(0, -5).toLowerCase();
		} else {
			this.currentPlan = 'free';
		}
	}

	handleAddMemberDialogOpen() {
		this.dialog.open(InviteMemberDialogComponent, {
			width: '25em',
			data: this.company,
		});
	}

	handleDeleteMemberDialogOpen(user: CompanyMember) {
		this.dialog.open(DeleteMemberDialogComponent, {
			width: '25em',
			data: { companyId: this.company.id, user },
		});
	}

	handleRevokeInvitationDialogOpen(userEmail: string) {
		this.dialog.open(RevokeInvitationDialogComponent, {
			width: '25em',
			data: { companyId: this.company.id, userEmail },
		});
	}

	changeCompanyName() {
		this.submittingChangedName = true;
		this._company.updateCompanyName(this.company.id, this.company.name).subscribe(
			() => {
				this.angulartics2.eventTrack.next({
					action: 'Company: company name is updated successfully',
				});
				posthog.capture('Company: company name is updated successfully');
				this.submittingChangedName = false;
			},
			() => (this.submittingChangedName = false),
			() => (this.submittingChangedName = false),
		);
	}

	updateRole(userId: string, userRole: CompanyMemberRole) {
		this.submittingUsersChange = true;
		this._company.updateCompanyMemberRole(this.company.id, userId, userRole).subscribe(() => {
			this.getCompanyMembers(this.company.id);
			this.angulartics2.eventTrack.next({
				action: 'Company: role is updated successfully',
			});
			posthog.capture('Company: role is updated successfully');
		});
	}

	switchSuspendance(isSuspendance: boolean, memberEmail: string) {
		console.log(isSuspendance, memberEmail);
		this.submittingUsersChange = true;
		if (isSuspendance) {
			this._company.suspendCompanyMember(this.company.id, [memberEmail]).subscribe(() => {
				this.angulartics2.eventTrack.next({
					action: 'Company: member is suspended',
				});
				posthog.capture('Company: member is suspended');
			});
		} else {
			this._company.restoreCompanyMember(this.company.id, [memberEmail]).subscribe(() => {
				this.angulartics2.eventTrack.next({
					action: 'Company: member is restored',
				});
				posthog.capture('Company: member is restored');
			});
		}
	}

	changeShowTestConnections(checked: boolean) {
		const displayMode = checked ? 'on' : 'off';
		this.submitting = true;
		this._company.updateShowTestConnections(displayMode).subscribe(() => {
			this.submitting = false;
			this.angulartics2.eventTrack.next({
				action: 'Company: show test connections is updated successfully',
			});
			posthog.capture('Company: show test connections is updated successfully');
		});
	}

	handleChangeCompanyDomain() {
		this.submittingCustomDomain = true;
		if (this.companyCustomDomain.id) {
			this._company.updateCustomDomain(this.company.id, this.companyCustomDomain.id).subscribe(() => {
				this.submittingCustomDomain = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: domain is updated successfully',
				});
				posthog.capture('Company: domain is updated successfully');
			});
		} else {
			this._company.createCustomDomain(this.company.id, this.companyCustomDomainHostname).subscribe(() => {
				this.submittingCustomDomain = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: domain is created successfully',
				});
				posthog.capture('Company: domain is created successfully');
			});
		}
	}

	handleDeleteDomainDialogOpen() {
		this.dialog.open(DeleteDomainDialogComponent, {
			width: '25em',
			data: { companyId: this.company.id, domain: this.companyCustomDomainHostname },
		});
	}

	onCompanyLogoSelected(event: any) {
		this.submittingLogo = true;

		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		let companyLogoFile: File | null = null;

		if (file) {
			companyLogoFile = file;
		} else {
			companyLogoFile = null;
		}

		this._company.uploadLogo(this.company.id, companyLogoFile).subscribe(
			(_res) => {
				this.submittingLogo = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: logo is uploaded successfully',
				});
				posthog.capture('Company: logo is uploaded successfully');
			},
			(_err) => {
				this.submittingLogo = false;
			},
		);
	}

	removeLogo() {
		this.submittingLogo = true;
		this._company.removeLogo(this.company.id).subscribe(
			(_res) => {
				this.submittingLogo = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: logo is removed successfully',
				});
				posthog.capture('Company: logo is removed successfully');
			},
			(_err) => {
				this.submittingLogo = false;
			},
		);
	}

	onFaviconSelected(event: any) {
		console.log('favicon selected');
		this.submittingFavicon = true;

		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		let faviconFile: File | null = null;

		if (file) {
			faviconFile = file;
		} else {
			faviconFile = null;
		}

		this._company.uploadFavicon(this.company.id, faviconFile).subscribe(
			(_res) => {
				this.submittingFavicon = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: favicon is uploaded successfully',
				});
				posthog.capture('Company: favicon is uploaded successfully');
			},
			(_err) => {
				this.submittingFavicon = false;
			},
		);
	}

	removeFavicon() {
		this.submittingFavicon = true;
		this._company.removeFavicon(this.company.id).subscribe(
			(_res) => {
				this.submittingFavicon = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: favicon is removed successfully',
				});
				posthog.capture('Company: favicon is removed successfully');
			},
			(_err) => {
				this.submittingFavicon = false;
			},
		);
	}

	updateTabTitle() {
		this.submittingTabTitle = true;
		this._company.updateTabTitle(this.company.id, this.companyTabTitle).subscribe(
			() => {
				this.submittingTabTitle = false;
				this.angulartics2.eventTrack.next({
					action: 'Company: tab title is updated successfully',
				});
				posthog.capture('Company: tab title is updated successfully');
			},
			(_err) => {
				this.submittingTabTitle = false;
			},
		);
	}

	deleteTabTitle() {
		this.submittingTabTitle = true;
		this._company.removeTabTitle(this.company.id).subscribe(() => {
			this.submittingTabTitle = false;
			this.angulartics2.eventTrack.next({
				action: 'Company: tab title is deleted successfully',
			});
			posthog.capture('Company: tab title is deleted successfully');
		});
	}
}
