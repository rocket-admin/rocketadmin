import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { CompanyService } from 'src/app/services/company.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SamlConfig } from 'src/app/models/company';

@Component({
  selector: 'app-sso',
  imports: [
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule
  ],
  templateUrl: './sso.component.html',
  styleUrl: './sso.component.css'
})
export class SsoComponent implements OnInit {

  public companyId: string;

  public samlConfigInitial: SamlConfig = {
    name: '',
    entryPoint: '',
    issuer: '',
    callbackUrl: '',
    cert: '',
    signatureAlgorithm: '',
    digestAlgorithm: "sha256",
    active: true,
    authnResponseSignedValidation: false,
    assertionsSignedValidation: false,
    allowedDomains: [],
    displayName: '',
    logoUrl: '',
    expectedIssuer: '',
    slug: ''
  };
  public samlConfig: SamlConfig = this.samlConfigInitial;

  public submitting: boolean = false;

  constructor(
    private router: Router,
    private _company: CompanyService
  ) { }

  ngOnInit() {
    this.companyId = this.router.routerState.snapshot.root.firstChild.params['company-id'];

    this._company.fetchSamlConfiguration(this.companyId).subscribe( (config) => {
      if (config.length) this.samlConfig = config[0];
    });
  }

  createSamlConfiguration() {
    this.submitting = true;
    this._company.createSamlConfiguration(this.companyId, this.samlConfig).subscribe(() => {
      this.submitting = false;
      this.router.navigate(['/company']);
    },
    () => { this.submitting = false; },
    () => { this.submitting = false; });
  }

  updateSamlConfiguration() {
    this.submitting = true;
    this._company.updateSamlConfiguration(this.samlConfig).subscribe(() => {
      this.submitting = false;
      this.router.navigate(['/company']);
    },
    () => { this.submitting = false; },
    () => { this.submitting = false; });
  }

}
