import { Component } from '@angular/core';

import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
  selector: 'app-mysql-credentials-form',
  templateUrl: './mysql-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './mysql-credentials-form.component.css']
})
export class MysqlCredentialsFormComponent extends BaseCredentialsFormComponent {

}
