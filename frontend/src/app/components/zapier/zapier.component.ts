import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { UserService } from 'src/app/services/user.service';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { AlertComponent } from '../ui-components/alert/alert.component';

@Component({
	selector: 'app-zapier',
	imports: [MatIconModule, MatButtonModule, ProfileSidebarComponent, AlertComponent],
	templateUrl: './zapier.component.html',
	styleUrl: './zapier.component.css',
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ZapierComponent implements OnInit {
	currentUser = toSignal(inject(UserService).cast);

	ngOnInit(): void {
		this._loadZapierElements();
	}

	private _loadZapierElements(): void {
		const cdnBase = 'https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements';

		if (!document.querySelector(`script[src="${cdnBase}/zapier-elements.esm.js"]`)) {
			const script = document.createElement('script');
			script.type = 'module';
			script.src = `${cdnBase}/zapier-elements.esm.js`;
			document.head.appendChild(script);
		}

		if (!document.querySelector(`link[href="${cdnBase}/zapier-elements.css"]`)) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = `${cdnBase}/zapier-elements.css`;
			document.head.appendChild(link);
		}
	}
}
