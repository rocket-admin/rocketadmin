import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { environment } from 'src/environments/environment';
import { UiSettingsService } from '../../../services/ui-settings.service';

@Component({
	selector: 'app-profile-sidebar',
	templateUrl: './profile-sidebar.component.html',
	styleUrls: ['./profile-sidebar.component.css'],
	imports: [CommonModule, RouterModule, MatListModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class ProfileSidebarComponent implements OnInit, AfterViewInit {
	activeTab = input<'account' | 'company' | 'subscription' | 'branding' | 'saml' | 'api' | 'secrets' | 'zapier'>(
		'account',
	);

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
