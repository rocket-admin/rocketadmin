import { Angulartics2Module } from 'angulartics2';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HostnameValidationDirective } from 'src/app/directives/hostnameValidator.directive';
import { MasterEncryptionPasswordComponent } from '../../master-encryption-password/master-encryption-password.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-dynamodb-credentials-form',
  templateUrl: './dynamodb-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './dynamodb-credentials-form.component.css'],
  imports: [
    NgIf,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    HostnameValidationDirective,
    MasterEncryptionPasswordComponent,
    Angulartics2Module
  ]
})
export class DynamodbCredentialsFormComponent extends BaseCredentialsFormComponent {

}
