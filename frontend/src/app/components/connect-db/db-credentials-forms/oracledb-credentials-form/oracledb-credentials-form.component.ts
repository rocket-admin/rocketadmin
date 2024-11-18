import { Component } from '@angular/core';

import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
  selector: 'app-oracledb-credentials-form',
  templateUrl: './oracledb-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './oracledb-credentials-form.component.css']
})
export class OracledbCredentialsFormComponent extends BaseCredentialsFormComponent {

}
