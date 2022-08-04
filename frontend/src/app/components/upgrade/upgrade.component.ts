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
  // public currentPlan;
  // public isCurrentAnnually = false;
  // public isAnnually = false;
  // public submitting = false;

  // plansTable = [
  //   {
  //     title: 'Database',
  //     free: 'MySQL, PostgreSQL',
  //     team: 'MySQL, PostgreSQL',
  //     enterprise: 'MySQL, PostgreSQL, Microsoft SQL, Oracle'
  //   },
  //   {
  //     title: 'User access',
  //     free: '3 members',
  //     team: 'unlimited',
  //     enterprise: 'unlimited'
  //   },
  //   {
  //     title: 'View, create and edit',
  //     free: true,
  //     team: true,
  //     enterprise: true
  //   },
  //   {
  //     title: 'Search and filters',
  //     free: true,
  //     team: true,
  //     enterprise: true
  //   },
  //   {
  //     title: 'Log audit',
  //     free: true,
  //     team: true,
  //     enterprise: true
  //   },
  //   {
  //     title: 'Client encryption',
  //     free: true,
  //     team: true,
  //     enterprise: true
  //   },
  // ]

  // public displayedColumns = ['title', 'free', 'team', 'enterprise']

  // public columns = [
  //   {key: 'title'},
  //   {key: 'free', name: 'Free', priceM: '0', priceA: '0'},
  //   {key: 'team', name: 'Team', priceM: '5', priceA: '50'},
  //   {key: 'enterprise', name: 'Enterprise', priceM: '10', priceA: '100'},
  // ]

  constructor(
    private _userService: UserService,
  ) { }

  ngOnInit(): void {
    this._userService.cast.subscribe(user => {
      this.setUser(user);
    });
  }

  setUser(user) {
    console.log(user);
    this.currentUser = user;
    // this.currentPlan = user.subscriptionLevel;

    // if (user.subscriptionLevel.startsWith('ANNUAL_')) {
    //   this.isAnnually = true;
    //   this.isCurrentAnnually = true;
    //   this.currentPlan = this.currentPlan.substring(7);
    // }

    // this.currentPlan = this.currentPlan.slice(0, -5).toLowerCase();
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

  // isCurrent(columnKey) {
  //   if (this.currentPlan === 'free') return this.currentPlan === columnKey;
  //   return this.currentPlan === columnKey && this.isCurrentAnnually === this.isAnnually;
  // }
}
