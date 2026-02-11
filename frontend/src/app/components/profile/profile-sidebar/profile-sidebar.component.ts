import { AfterViewInit, Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiSettingsService } from '../../../services/ui-settings.service';
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-profile-sidebar',
	templateUrl: './profile-sidebar.component.html',
	styleUrls: ['./profile-sidebar.component.css'],
	imports: [
		CommonModule,
		RouterModule,
		MatListModule,
		MatIconModule,
		MatButtonModule,
		MatTooltipModule,
	],
})
export class ProfileSidebarComponent implements OnInit, AfterViewInit {
	activeTab = input<'account' | 'company' | 'pricing' | 'branding' | 'saml' | 'api' | 'secrets' | 'zapier'>('account');

	collapsed = signal(false);
	initialized = signal(false);
	isSaas = environment.saas;

	private _uiSettings = inject(UiSettingsService);

	ngOnInit(): void {
		this._loadCollapsedState();
	}

	ngAfterViewInit(): void {
		setTimeout(() => this.initialized.set(true), 0);
	}

	toggleCollapsed(): void {
		this.collapsed.update((v) => {
			const newValue = !v;
			this._uiSettings.updateGlobalSetting('profileSidebarCollapsed', newValue);
			return newValue;
		});
	}

	private _loadCollapsedState(): void {
		this._uiSettings.getUiSettings().subscribe((settings) => {
			this.collapsed.set(settings?.globalSettings?.profileSidebarCollapsed ?? false);
		});
	}
}
