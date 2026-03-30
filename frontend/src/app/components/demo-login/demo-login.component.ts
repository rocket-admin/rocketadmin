import { Component, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { AuthService } from 'src/app/services/auth.service';

@Component({
	selector: 'app-demo-login',
	templateUrl: './demo-login.component.html',
	styleUrls: ['./demo-login.component.css'],
	imports: [MatProgressSpinnerModule],
})
export class DemoLoginComponent implements OnInit {
	constructor(
		private _auth: AuthService,
		private angulartics2: Angulartics2,
	) {}

	ngOnInit(): void {
		this._auth.loginToDemoAccount().subscribe(() => {
			this.angulartics2.eventTrack.next({
				action: 'Demo account is logged in',
			});
			posthog.capture('Demo account is logged in');
		});
	}
}
