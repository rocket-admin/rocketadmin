import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-upgrade',
  templateUrl: './upgrade.component.html',
  styleUrls: ['./upgrade.component.css']
})
export class UpgradeComponent implements OnInit {
  public currentUser: User;
  public id = '1234567890';
  public currentPlan = {
    key: 'free',
    isAnnually: false,
    priceM: '0',
  };
  public isAnnually = false;
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

  public displayedColumns = ['title', 'free', 'team', 'enterprise']

  public plans = [
    {key: 'title'},
    {key: 'free', name: 'Free', priceM: '0', priceA: '0'},
    {key: 'team', name: 'Team', priceM: '5', priceA: '50'},
    {key: 'enterprise', name: 'Enterprise', priceM: '10', priceA: '100'},
  ]

  constructor(
    private _userService: UserService,
  ) { }

  ngOnInit(): void {
    this._userService.cast.subscribe(user => {
      // user.subscriptionLevel = "ANNUAL_ENTERPRISE_PLAN";
      this.setUser(user);
    });
  }

  setUser(user: User) {
    console.log(user);
    this.currentUser = user;
    // this.currentUser.subscriptionLevel = "FREE_PLAN";

    let currentPlanKey = this.currentUser.subscriptionLevel || 'FREE_PLAN';
    if (this.currentUser.subscriptionLevel.startsWith('ANNUAL_')) {
      this.isAnnually = true;
      currentPlanKey = currentPlanKey.substring(7);
    }

    currentPlanKey = currentPlanKey.slice(0, -5).toLowerCase();

    this.currentPlan = {
      key: currentPlanKey,
      isAnnually: this.isAnnually,
      priceM: this.plans.find(plan => plan.key === currentPlanKey).priceM,
    };

    console.log(this.currentPlan);
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

  isCurrent(columnKey) {
    if (this.currentPlan.key === 'free') return this.currentPlan.key === columnKey;
    return this.currentPlan.key === columnKey && this.currentPlan.isAnnually === this.isAnnually;
  }

  getCaption(columnKey) {
    if (this.currentPlan === columnKey) return 'Change';
  }

  isMoreExpensive (priceM) {
    return parseInt(this.currentPlan.priceM) <= parseInt(priceM);
  }
}
