import { Component } from '@angular/core';
import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
  selector: 'app-dynamodb-credentials-form',
  templateUrl: './dynamodb-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './dynamodb-credentials-form.component.css']
})
export class DynamodbCredentialsFormComponent extends BaseCredentialsFormComponent {

}
