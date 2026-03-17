import { Component, input } from '@angular/core';

import { AlertType } from 'src/app/models/alert';

@Component({
	selector: 'app-banner',
	templateUrl: './banner.component.html',
	styleUrls: ['./banner.component.css'],
})
export class BannerComponent {
	type = input<AlertType>();
}
