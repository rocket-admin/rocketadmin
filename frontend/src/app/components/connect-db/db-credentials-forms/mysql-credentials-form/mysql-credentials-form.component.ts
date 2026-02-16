import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Angulartics2Module } from 'angulartics2';
import posthog from 'posthog-js';
import { HostnameValidationDirective } from 'src/app/directives/hostnameValidator.directive';
import { MasterEncryptionPasswordComponent } from '../../master-encryption-password/master-encryption-password.component';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
	selector: 'app-mysql-credentials-form',
	templateUrl: './mysql-credentials-form.component.html',
	styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './mysql-credentials-form.component.css'],
	standalone: true,
	imports: [
		NgIf,
		FormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatCheckboxModule,
		MatExpansionModule,
		HostnameValidationDirective,
		MasterEncryptionPasswordComponent,
		Angulartics2Module,
	],
})
export class MysqlCredentialsFormComponent extends BaseCredentialsFormComponent {
	protected posthog = posthog;
}
