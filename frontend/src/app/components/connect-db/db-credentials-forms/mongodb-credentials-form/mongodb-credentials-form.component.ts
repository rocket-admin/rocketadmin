import { Component } from '@angular/core';

import { BaseCredentialsFormComponent } from '../base-credentials-form/base-credentials-form.component';

@Component({
  selector: 'app-mongodb-credentials-form',
  templateUrl: './mongodb-credentials-form.component.html',
  styleUrls: ['../base-credentials-form/base-credentials-form.component.css', './mongodb-credentials-form.component.css']
})
export class MongodbCredentialsFormComponent extends BaseCredentialsFormComponent {

}
