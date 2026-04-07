import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { CompanyMemberRole } from 'src/app/models/company';
import { PlanKey } from 'src/app/models/plans';
import { CompanyService } from 'src/app/services/company.service';
import { PaymentService } from 'src/app/services/payment.service';
import { UserService } from 'src/app/services/user.service';
import plans from '../../consts/plans';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { AlertComponent } from '../ui-components/alert/alert.component';

@Component({
	selector: 'app-upgrade',
	standalone: true,
	imports: [
		CommonModule,
		MatButtonModule,
		MatIconModule,
		MatTableModule,
		MatChipsModule,
		RouterModule,
		AlertComponent,
		ProfileSidebarComponent,
	],
	templateUrl: './upgrade.component.html',
	styleUrls: ['./upgrade.component.css'],
})
export class UpgradeComponent implements OnInit {
	public currentPlan = {
		key: PlanKey.Free,
		price: 0,
		name: 'Free',
	};
	public hasPaymentMethod = false;
	public portalLink: string = null;
	public companyId: string;
	public submitting = false;
	public isAdmin = false;

	hostedInstances = [
		{
			title: 'Hosted PostgreSQL',
			free: 'Tiny node (0.1 CPU, 100 MB)',
			team: 'Scalable node — $0.04/CPU/min, $0.2/GB/mo, $0.04/M IOPS',
			enterprise: 'Scalable node — $0.04/CPU/min, $0.2/GB/mo, $0.04/M IOPS',
		},
	];

	databases = [
		{
			title: 'MySQL',
			free: '3',
			team: '∞',
			enterprise: '∞',
		},
		{
			title: 'PostgreSQL',
			free: 3,
			team: '∞',
			enterprise: '∞',
		},
		{
			title: 'MongoDB',
			free: 3,
			team: '∞',
			enterprise: '∞',
		},
		{
			title: 'DynamoDB',
			free: 3,
			team: '∞',
			enterprise: '∞',
		},
		{
			title: 'IBM DB2',
			free: 3,
			team: '∞',
			enterprise: '∞',
		},
		{
			title: 'Oracle',
			free: 1,
			team: 1,
			enterprise: '∞',
		},
		{
			title: 'Microsoft SQL',
			free: 1,
			team: 1,
			enterprise: '∞',
		},
		{
			title: 'Cassandra',
			free: 1,
			team: 1,
			enterprise: '∞',
		},
	];

	users = [
		{
			title: 'Priority support',
			free: '',
			team: true,
			enterprise: true,
		},
		{
			title: 'SAML SSO',
			free: '',
			team: '',
			enterprise: true,
		},
		{
			title: '99.9% uptime SLA',
			free: '',
			team: '',
			enterprise: true,
		},
	];

	features = [
		{
			title: 'Standard actions (CRUD)',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Custom actions and webhooks',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Export / Import',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Search and filters',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Record fields customization',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Client encryption',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Branding',
			free: true,
			team: true,
			enterprise: true,
		},
		{
			title: 'Custom domain',
			free: '',
			team: true,
			enterprise: true,
		},
		{
			title: 'Log audit',
			free: '',
			team: true,
			enterprise: true,
		},
	];

	public plans = plans;
	public displayedColumns = plans.map((plan) => plan.key);

	constructor(
		private _paymentService: PaymentService,
		private _company: CompanyService,
		private _userService: UserService,
	) {}

	ngOnInit(): void {
		this.getCompanyPaln();
		this._userService.cast.subscribe((user) => {
			this.isAdmin = user.role === CompanyMemberRole.CAO;
		});
	}

	getCompanyPaln() {
		this._company.fetchCompany().subscribe((company) => {
			this.currentPlan = this.getPlan(company.subscriptionLevel);
			this.companyId = company.id;
			this.hasPaymentMethod = company.is_payment_method_added;
			this.portalLink = company.portal_link;
		});
	}

	getPlan(planKey: PlanKey) {
		let currentPlanKey = planKey || 'FREE_PLAN';
		if (currentPlanKey.startsWith('ANNUAL_')) {
			currentPlanKey = currentPlanKey.substring(7);
		}

		currentPlanKey = currentPlanKey.slice(0, -5).toLowerCase();
		const planData = plans.find((plan) => plan.key === currentPlanKey);

		return {
			key: currentPlanKey as PlanKey,
			price: planData?.price || 0,
			name: planData?.name || 'Free',
		};
	}

	changePlan(planKey: PlanKey) {
		this.submitting = true;
		const formattedPlanKey = planKey.toUpperCase() + '_PLAN';
		this._paymentService.changeSubscription(this.companyId, formattedPlanKey).subscribe(
			() => {
				this.getCompanyPaln();
				this.submitting = false;
			},
			() => (this.submitting = false),
			() => (this.submitting = false),
		);
	}

	// upgradePlan(plan, isAnnually: boolean) {
	//   this.submitting = true;
	//   let subscriptionLevel = `${plan.toUpperCase()}_PLAN`;
	//   if (isAnnually && plan !== 'free') subscriptionLevel = `ANNUAL_${subscriptionLevel}`;
	//   this._userService.upgradeUser(subscriptionLevel).subscribe(() => {
	//     this._userService.fetchUser().subscribe(() => {
	//         this.submitting = false;
	//         this.isCurrentAnnually = this.isAnnually
	//       }
	//     );
	//   },
	//   () => this.submitting = false,
	//   () => this.submitting = false);
	// }
}
