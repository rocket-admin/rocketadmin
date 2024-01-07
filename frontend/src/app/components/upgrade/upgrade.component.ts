import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import plans from '../../consts/plans';
import { CompanyService } from 'src/app/services/company.service';
import { PaymentService } from 'src/app/services/payment.service';
import { PlanKey } from 'src/app/models/plans';

@Component({
  selector: 'app-upgrade',
  templateUrl: './upgrade.component.html',
  styleUrls: ['./upgrade.component.css']
})
export class UpgradeComponent implements OnInit {
  public currentPlan = {
    key: PlanKey.Free,
    price: 0,
  };
  public hasStripeAccount = false;
  public companyId: string;
  public submitting = false;

  plansTable = [
    {
      title: 'Database',
      free: 'MySQL, PostgreSQL',
      team: 'MySQL, PostgreSQL',
      enterprise: 'MySQL, PostgreSQL, \n Microsoft SQL, Oracle'
    },
    {
      title: 'User access',
      free: '3 members',
      team: 'unlimited',
      enterprise: 'unlimited'
    },
    {
      title: 'View, create and edit',
      free: true,
      team: true,
      enterprise: true
    },
    {
      title: 'Search and filters',
      free: true,
      team: true,
      enterprise: true
    },
    {
      title: 'Log audit',
      free: true,
      team: true,
      enterprise: true
    },
    {
      title: 'Client encryption',
      free: true,
      team: true,
      enterprise: true
    },
  ]

  public plans = plans;
  public displayedColumns = plans.map(plan => plan.key);

  constructor(
    private _paymentService: PaymentService,
    private _company: CompanyService,
  ) { }

  ngOnInit(): void {
    this.getCompanyPaln();
  }

  getCompanyPaln() {
    this._company.fetchCompany().subscribe(company => {
      this.currentPlan = this.getPlan(company.subscriptionLevel);
      this.companyId = company.id;
      this.hasStripeAccount = !!company.portal_link;
    })
  }

  getPlan(planKey: PlanKey) {
    let currentPlanKey = planKey || 'FREE_PLAN';
    if (currentPlanKey.startsWith('ANNUAL_')) {
      currentPlanKey = currentPlanKey.substring(7);
    }

    currentPlanKey = currentPlanKey.slice(0, -5).toLowerCase();

    return {
      key: currentPlanKey as PlanKey,
      price: plans.find(plan => plan.key === currentPlanKey).price,
    };
  }

  changePlan(planKey: PlanKey) {
    this.submitting = true;
    const formattedPlanKey = planKey.toUpperCase() + '_PLAN';
    this._paymentService.changeSubscription(this.companyId, formattedPlanKey).subscribe(() => {
      this.getCompanyPaln();
      this.submitting = false;
    },
    () => this.submitting = false,
    () => this.submitting = false);
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
