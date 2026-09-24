import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { Company, SamlConfig } from 'src/app/models/company';
import { CompanyService } from 'src/app/services/company.service';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { PlaceholderSsoComponent } from '../skeletons/placeholder-sso/placeholder-sso.component';
import { AlertComponent } from '../ui-components/alert/alert.component';

@Component({
	selector: 'app-sso',
	imports: [
		CommonModule,
		MatInputModule,
		MatCheckboxModule,
		MatButtonModule,
		MatTooltipModule,
		FormsModule,
		MatFormFieldModule,
		AlertComponent,
		ProfileSidebarComponent,
		PlaceholderSsoComponent,
	],
	templateUrl: './sso.component.html',
	styleUrl: './sso.component.css',
})
export class SsoComponent implements OnInit {
	public company: Company = null;

	public samlConfigInitial: SamlConfig = {
		name: '',
		entryPoint: '',
		issuer: '',
		callbackUrl: '',
		cert: '',
		signatureAlgorithm: '',
		digestAlgorithm: 'sha256',
		active: true,
		authnResponseSignedValidation: false,
		assertionsSignedValidation: false,
		allowedDomains: [],
		displayName: '',
		logoUrl: '',
		expectedIssuer: '',
		slug: '',
	};
	public samlConfig: SamlConfig = this.samlConfigInitial;

	public submitting: boolean = false;
	public saved: boolean = false;

	constructor(
		private _company: CompanyService,
		private title: Title,
	) {}

	ngOnInit() {
		this._company.getCurrentTabTitle().subscribe((tabTitle) => {
			this.title.setTitle(`SAML SSO | ${tabTitle || 'Rocketadmin'}`);
		});

		this._company.fetchCompany().subscribe((res) => {
			this.company = res;
			this._company.fetchSamlConfiguration(res.id).subscribe((config) => {
				if (config.length) this.samlConfig = config[0];
			});
		});
	}

	createSamlConfiguration() {
		this.submitting = true;
		this._company.createSamlConfiguration(this.company.id, this.samlConfig).subscribe(
			() => {
				this.submitting = false;
				this.saved = true;
				setTimeout(() => (this.saved = false), 3000);
			},
			() => {
				this.submitting = false;
			},
		);
	}

	updateSamlConfiguration() {
		this.submitting = true;
		this._company.updateSamlConfiguration(this.samlConfig).subscribe(
			() => {
				this.submitting = false;
				this.saved = true;
				setTimeout(() => (this.saved = false), 3000);
			},
			() => {
				this.submitting = false;
			},
		);
	}
}
