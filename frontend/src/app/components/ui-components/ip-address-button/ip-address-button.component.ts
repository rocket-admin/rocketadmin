import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { Component, inject, input } from '@angular/core';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
	selector: 'app-ip-address-button',
	templateUrl: './ip-address-button.component.html',
	styleUrls: ['./ip-address-button.component.css'],
	imports: [CdkCopyToClipboard],
})
export class IpAddressButtonComponent {
	private _notifications = inject(NotificationsService);

	ip = input<string>('');

	showCopyNotification(message: string) {
		this._notifications.showSuccessSnackbar(message);
	}
}
