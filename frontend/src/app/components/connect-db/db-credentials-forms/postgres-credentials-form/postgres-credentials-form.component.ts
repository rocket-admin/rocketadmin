import { Component } from '@angular/core';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
  selector: 'app-postgres-credentials-form',
  templateUrl: './postgres-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './postgres-credentials-form.component.css']
})
export class PostgresCredentialsFormComponent extends BaseCredentialsFormComponent {

}
