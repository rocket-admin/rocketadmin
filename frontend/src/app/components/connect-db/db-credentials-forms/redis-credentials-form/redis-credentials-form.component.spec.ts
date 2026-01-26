import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { RedisCredentialsFormComponent } from './redis-credentials-form.component';
import { provideHttpClient } from '@angular/common/http';

describe('RedisCredentialsFormComponent', () => {
  let component: RedisCredentialsFormComponent;
  let fixture: ComponentFixture<RedisCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatCheckboxModule,
        BrowserAnimationsModule,
        Angulartics2Module.forRoot({}),
        RedisCredentialsFormComponent
    ],
    providers: [provideHttpClient()]
})
    .compileComponents();

    fixture = TestBed.createComponent(RedisCredentialsFormComponent);
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
