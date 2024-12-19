import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MongodbCredentialsFormComponent } from './mongodb-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { ConnectionType, DBtype } from 'src/app/models/connection';
import { MatCheckboxModule } from '@angular/material/checkbox';

describe('MongodbCredentialsFormComponent', () => {
  let component: MongodbCredentialsFormComponent;
  let fixture: ComponentFixture<MongodbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatCheckboxModule,
        MongodbCredentialsFormComponent
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(MongodbCredentialsFormComponent);
    component = fixture.componentInstance;

    component.connection = {
      id: "12345678"
    } as any;

    // component.connection = {
    //   "title": "Test connection via SSH tunnel to mySQL",
    //   "masterEncryption": false,
    //   "type": DBtype.MySQL,
    //   "host": "database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com",
    //   "port": "3306",
    //   "username": "admin",
    //   "database": "testDB",
    //   "schema": null,
    //   "sid": null,
    //   "id": "9d5f6d0f-9516-4598-91c4-e4fe6330b4d4",
    //   "ssh": true,
    //   "sshHost": "3.134.99.192",
    //   "sshPort": '22',
    //   "sshUsername": "ubuntu",
    //   "ssl": false,
    //   "cert": null,
    //   "connectionType": ConnectionType.Direct,
    //   "azure_encryption": false,
    //   "signing_key": ''
    // };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
