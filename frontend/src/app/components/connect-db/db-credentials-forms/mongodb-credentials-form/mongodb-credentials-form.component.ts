import { Angulartics2Module } from 'angulartics2';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MasterEncryptionPasswordComponent } from '../../master-encryption-password/master-encryption-password.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-mongodb-credentials-form',
  templateUrl: './mongodb-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './mongodb-credentials-form.component.css'],
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatExpansionModule,
    MasterEncryptionPasswordComponent,
    Angulartics2Module
  ]
})
export class MongodbCredentialsFormComponent extends BaseCredentialsFormComponent {

}
