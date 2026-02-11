import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf } from '@angular/common';
import { Angulartics2, Angulartics2OnModule } from 'angulartics2';
import { Subscription } from 'rxjs';
import { Title } from '@angular/platform-browser';

import { AlertComponent } from '../ui-components/alert/alert.component';
import { CompanyService } from 'src/app/services/company.service';
import { UserService } from 'src/app/services/user.service';
import { Company } from 'src/app/models/company';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { DeleteDomainDialogComponent } from '../company/delete-domain-dialog/delete-domain-dialog.component';
import { environment } from 'src/environments/environment';
import { PlaceholderBrandingComponent } from '../skeletons/placeholder-branding/placeholder-branding.component';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.css'],
  imports: [
    NgIf,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    Angulartics2OnModule,
    AlertComponent,
    ProfileSidebarComponent,
    PlaceholderBrandingComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BrandingComponent implements OnInit, OnDestroy {
  public isSaas = (environment as any).saas;
  public company: Company = null;
  public currentPlan: string;
  public currentUser: any;

  public companyCustomDomain: {
    id: string,
    companyId: string,
    hostname: string,
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

  get whiteLabelSettings(): {logo: string, favicon: string, tabTitle: string} {
    return this._company.whiteLabelSettings || { logo: '', favicon: '', tabTitle: '' };
  }

  get isDemo() {
    return this._user.isDemo;
  }

  private subscriptions: Subscription[] = [];

  constructor(
    private _company: CompanyService,
    private _user: UserService,
    private dialog: MatDialog,
    private angulartics2: Angulartics2,
    private title: Title
  ) {}

  ngOnInit() {
    this.isCustomDomain = this._company.isCustomDomain() && this.isSaas;

    const titleSub = this._company.getCurrentTabTitle().subscribe(tabTitle => {
      this.companyTabTitle = tabTitle;
      this.title.setTitle(`Branding | ${tabTitle || 'Rocketadmin'}`);
    });
    this.subscriptions.push(titleSub);

    const userSub = this._user.cast.subscribe(user => {
      this.currentUser = user;
    });
    this.subscriptions.push(userSub);

    this._company.fetchCompany().subscribe(res => {
      this.company = res;
      this.setCompanyPlan(res.subscriptionLevel);
      if (this.isCustomDomain) {
        this.companyCustomDomainHostname = res.custom_domain;
      } else {
        this.getCompanyCustomDomain(res.id);
      }
    });

    const castSub = this._company.cast.subscribe(arg => {
      if (arg === 'domain') {
        this.getCompanyCustomDomain(this.company.id);
      } else if (arg === 'updated-white-label-settings') {
        this._company.getWhiteLabelProperties(this.company.id).subscribe();
      }
    });
    this.subscriptions.push(castSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getCompanyCustomDomain(companyId: string) {
    this._company.getCustomDomain(companyId).subscribe(res => {
      if (res.success) {
        this.companyCustomDomain = res.domain_info;
        this.companyCustomDomainHostname = res.domain_info.hostname;
        this.companyCustomDomainThirdLevel = this.companyCustomDomainHostname.split('.')[0];
      } else {
        this.companyCustomDomain = {
          id: null,
          companyId: companyId,
          hostname: ''
        };
        this.companyCustomDomainHostname = '';
        this.companyCustomDomainPlaceholder = `${this.company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`;
        this.companyCustomDomainThirdLevel = this.companyCustomDomainPlaceholder.split('.')[0];
      }
    });
  }

  setCompanyPlan(subscriptionLevel: string) {
    if (subscriptionLevel) {
      this.currentPlan = subscriptionLevel.slice(0, -5).toLowerCase();
    } else {
      this.currentPlan = 'free';
    }
  }

  handleChangeCompanyDomain() {
    this.submittingCustomDomain = true;
    if (this.companyCustomDomain.id) {
      this._company.updateCustomDomain(this.company.id, this.companyCustomDomain.id).subscribe(() => {
        this.submittingCustomDomain = false;
        this.angulartics2.eventTrack.next({
          action: 'Company: domain is updated successfully',
        });
      });
    } else {
      this._company.createCustomDomain(this.company.id, this.companyCustomDomainHostname).subscribe(() => {
        this.submittingCustomDomain = false;
        this.angulartics2.eventTrack.next({
          action: 'Company: domain is created successfully',
        });
      });
    }
  }

  handleDeleteDomainDialogOpen() {
    this.dialog.open(DeleteDomainDialogComponent, {
      width: '25em',
      data: { companyId: this.company.id, domain: this.companyCustomDomainHostname }
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

    this._company.uploadLogo(this.company.id, companyLogoFile).subscribe(_res => {
      this.submittingLogo = false;
      this.angulartics2.eventTrack.next({
        action: 'Company: logo is uploaded successfully',
      });
    }, _err => {
      this.submittingLogo = false;
    });
  }

  removeLogo() {
    this.submittingLogo = true;
    this._company.removeLogo(this.company.id).subscribe(_res => {
      this.submittingLogo = false;
      this.angulartics2.eventTrack.next({
        action: 'Company: logo is removed successfully',
      });
    }, _err => {
      this.submittingLogo = false;
    });
  }

  onFaviconSelected(event: any) {
    this.submittingFavicon = true;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    let faviconFile: File | null = null;

    if (file) {
      faviconFile = file;
    } else {
      faviconFile = null;
    }

    this._company.uploadFavicon(this.company.id, faviconFile).subscribe(_res => {
      this.submittingFavicon = false;
      this.angulartics2.eventTrack.next({
        action: 'Company: favicon is uploaded successfully',
      });
    }, _err => {
      this.submittingFavicon = false;
    });
  }

  removeFavicon() {
    this.submittingFavicon = true;
    this._company.removeFavicon(this.company.id).subscribe(_res => {
      this.submittingFavicon = false;
      this.angulartics2.eventTrack.next({
        action: 'Company: favicon is removed successfully',
      });
    }, _err => {
      this.submittingFavicon = false;
    });
  }

  updateTabTitle() {
    this.submittingTabTitle = true;
    this._company.updateTabTitle(this.company.id, this.companyTabTitle).subscribe(() => {
      this.submittingTabTitle = false;
      this.angulartics2.eventTrack.next({
        action: 'Company: tab title is updated successfully',
      });
    }, _err => {
      this.submittingTabTitle = false;
    });
  }

  deleteTabTitle() {
    this.submittingTabTitle = true;
    this._company.removeTabTitle(this.company.id).subscribe(() => {
      this.submittingTabTitle = false;
      this.angulartics2.eventTrack.next({
        action: 'Company: tab title is deleted successfully',
      });
    });
  }
}
