import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { AlertComponent } from '../ui-components/alert/alert.component';

@Component({
	selector: 'app-email-verification',
	templateUrl: './email-verification.component.html',
	styleUrls: ['./email-verification.component.css'],
	imports: [CommonModule, FormsModule, RouterModule, AlertComponent],
})
export class EmailVerificationComponent implements OnInit {
	isVerified: boolean = null;
	isLoggedin: boolean = null;

	constructor(
		private _auth: AuthService,
		private route: ActivatedRoute,
		public router: Router,
	) {}

	ngOnInit(): void {
		this.route.paramMap
			.pipe(
				map((params: ParamMap) => {
					const verificationToken = params.get('verification-token');
					const expirationTime = localStorage.getItem('token_expiration');

					this._auth.verifyEmail(verificationToken).subscribe(() => {
						if (expirationTime) {
							this.router.navigate(['/user-settings']);
						} else {
							this.router.navigate(['/login']);
						}
						this.isVerified = true;
					});
				}),
			)
			.subscribe();
	}
}
