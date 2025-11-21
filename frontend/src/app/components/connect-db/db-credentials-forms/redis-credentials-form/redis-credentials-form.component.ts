import { Angulartics2Module } from 'angulartics2';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HostnameValidationDirective } from 'src/app/directives/hostnameValidator.directive';
import { MasterEncryptionPasswordComponent } from '../../master-encryption-password/master-encryption-password.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-redis-credentials-form',
  templateUrl: './redis-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './redis-credentials-form.component.css'],
  imports: [
    NgIf,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatExpansionModule,
    HostnameValidationDirective,
    MasterEncryptionPasswordComponent,
    Angulartics2Module
  ]
})
export class RedisCredentialsFormComponent extends BaseCredentialsFormComponent {

}
