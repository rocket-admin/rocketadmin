import { Component } from '@angular/core';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
  selector: 'app-mssql-credentials-form',
  templateUrl: './mssql-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './mssql-credentials-form.component.css']
})
export class MssqlCredentialsFormComponent extends BaseCredentialsFormComponent {

}
