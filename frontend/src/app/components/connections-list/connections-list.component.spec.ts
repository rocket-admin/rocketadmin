import { of } from 'rxjs';
import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ConnectionsListComponent } from './connections-list.component';
import { ConnectionsService } from 'src/app/services/connections.service';
import { RouterTestingModule } from "@angular/router/testing";
import { UserService } from 'src/app/services/user.service';

describe('ConnectionsListComponent', () => {
  let component: ConnectionsListComponent;
  let fixture: ComponentFixture<ConnectionsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule
      ],
      declarations: [ ConnectionsListComponent ],
      providers: [
        {
          provide: ConnectionsService,
          // useClass: ConnectionsServiseStub
        }
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sort connections on test and own, and set object of titles', () => {
    const fakeConnections = {
      "connections": [
        {
          "connection": {
            "id": "9176a5d1-624f-48af-b5a2-f0a08e15252f",
            "title": "new test agent",
            "masterEncryption": false,
            "type": "agent_mysql",
            "host": null,
            "port": null,
            "username": null,
            "database": null,
            "schema": null,
            "sid": null,
            "createdAt": "2021-09-03T14:45:21.154Z",
            "updatedAt": "2021-09-03T14:45:21.154Z",
            "ssh": false,
            "sshHost": null,
            "sshPort": null,
            "sshUsername": null,
            "ssl": false,
            "cert": null,
            "isTestConnection": false
          },
          "accessLevel": "edit"
        },
        {
          "connection": {
            "id": "944b546a-5141-4c89-b0da-39bcc904ffea",
            "title": "Test connection to MSSQL",
            "masterEncryption": false,
            "type": "agent_mssql",
            "host": "U2FsdGVkX18Aqg8bUNwW/QQyadQRimuU6wSuerla/aM2+7902zH1PCNIuBYwnvKK88NNyjiuaxdXC44S5zApDabiqyG75Tj9jaxRntrKElU=",
            "port": 1433,
            "username": "U2FsdGVkX1/p7kOB3MpSmBvOlMcVaw2rwM1T/bd+b/c=",
            "database": "U2FsdGVkX18KzyNPZrNUi734AbAG/ON5ijxj4k3rC2A=",
            "schema": null,
            "sid": null,
            "createdAt": "2021-09-03T10:29:48.168Z",
            "updatedAt": "2021-09-03T14:50:26.085Z",
            "ssh": false,
            "sshHost": null,
            "sshPort": null,
            "sshUsername": null,
            "ssl": false,
            "cert": null,
            "isTestConnection": true
          },
          "accessLevel": "edit"
        },
        {
          "connection": {
            "id": "5f80922d-f4bf-4a91-a7d3-d3f38dfcaa4e",
            "title": "Test connection to OracleDB",
            "masterEncryption": false,
            "type": "agent_oracledb",
            "host": "U2FsdGVkX1/TdsnH5xIQaCvFXU8CpkJMKnSX1l+5JVQ6+WrFk83OeZ629tHLtVMG04Ht+H6kpstKZ01PrqZfBhM2OvLL2rw0bImen/TGFuw=",
            "port": 1521,
            "username": "U2FsdGVkX19oQClMIPyFNxEYeSPNLJIDpnYPSWKfyWU=",
            "database": "U2FsdGVkX19NJkB1M3ydah9qjZQZBcnnLU03T0Y7PeY=",
            "schema": null,
            "sid": "ORCL",
            "createdAt": "2021-09-03T10:29:48.150Z",
            "updatedAt": "2021-09-03T14:45:51.582Z",
            "ssh": false,
            "sshHost": null,
            "sshPort": null,
            "sshUsername": null,
            "ssl": false,
            "cert": null,
            "isTestConnection": true
          },
          "accessLevel": "edit"
        }
      ],
      "connectionsCount": 3
    };

    component.setConnections(fakeConnections);
    fixture.detectChanges();

    expect(component.connections).toEqual([
      {
          "connection": {
            "id": "9176a5d1-624f-48af-b5a2-f0a08e15252f",
            "title": "new test agent",
            "masterEncryption": false,
            "type": "agent_mysql",
            "host": null,
            "port": null,
            "username": null,
            "database": null,
            "schema": null,
            "sid": null,
            "createdAt": "2021-09-03T14:45:21.154Z",
            "updatedAt": "2021-09-03T14:45:21.154Z",
            "ssh": false,
            "sshHost": null,
            "sshPort": null,
            "sshUsername": null,
            "ssl": false,
            "cert": null,
            "isTestConnection": false
          },
          "accessLevel": "edit"
        }
    ] as any);
    expect(component.testConnections).toEqual([
      {
        "connection": {
          "id": "944b546a-5141-4c89-b0da-39bcc904ffea",
          "title": "Test connection to MSSQL",
          "masterEncryption": false,
          "type": "agent_mssql",
          "host": "U2FsdGVkX18Aqg8bUNwW/QQyadQRimuU6wSuerla/aM2+7902zH1PCNIuBYwnvKK88NNyjiuaxdXC44S5zApDabiqyG75Tj9jaxRntrKElU=",
          "port": 1433,
          "username": "U2FsdGVkX1/p7kOB3MpSmBvOlMcVaw2rwM1T/bd+b/c=",
          "database": "U2FsdGVkX18KzyNPZrNUi734AbAG/ON5ijxj4k3rC2A=",
          "schema": null,
          "sid": null,
          "createdAt": "2021-09-03T10:29:48.168Z",
          "updatedAt": "2021-09-03T14:50:26.085Z",
          "ssh": false,
          "sshHost": null,
          "sshPort": null,
          "sshUsername": null,
          "ssl": false,
          "cert": null,
          "isTestConnection": true
        },
        "accessLevel": "edit"
      },
      {
        "connection": {
          "id": "5f80922d-f4bf-4a91-a7d3-d3f38dfcaa4e",
          "title": "Test connection to OracleDB",
          "masterEncryption": false,
          "type": "agent_oracledb",
          "host": "U2FsdGVkX1/TdsnH5xIQaCvFXU8CpkJMKnSX1l+5JVQ6+WrFk83OeZ629tHLtVMG04Ht+H6kpstKZ01PrqZfBhM2OvLL2rw0bImen/TGFuw=",
          "port": 1521,
          "username": "U2FsdGVkX19oQClMIPyFNxEYeSPNLJIDpnYPSWKfyWU=",
          "database": "U2FsdGVkX19NJkB1M3ydah9qjZQZBcnnLU03T0Y7PeY=",
          "schema": null,
          "sid": "ORCL",
          "createdAt": "2021-09-03T10:29:48.150Z",
          "updatedAt": "2021-09-03T14:45:51.582Z",
          "ssh": false,
          "sshHost": null,
          "sshPort": null,
          "sshUsername": null,
          "ssl": false,
          "cert": null,
          "isTestConnection": true
        },
        "accessLevel": "edit"
      }
    ] as any);
    expect(component.titles).toEqual({
      "9176a5d1-624f-48af-b5a2-f0a08e15252f": "new test agent",
      "944b546a-5141-4c89-b0da-39bcc904ffea": "Test connection to MSSQL",
      "5f80922d-f4bf-4a91-a7d3-d3f38dfcaa4e": "Test connection to OracleDB"
    })
  });

  it('should get connection title if it is pointed', () => {
    const connection = {
      title: 'SQL connection'
    }

    const connectionTitle = component.getTitle(connection as any);
    expect(connectionTitle).toEqual('SQL connection');
  });

  it('should get db name as connection title if it is not pointed', () => {
    const connection = {
      database: 'testDB'
    }

    const connectionTitle = component.getTitle(connection as any);
    expect(connectionTitle).toEqual('testDB');
  });

  it('should get Untitled encrypted connection as connection title if it is not pointed and connection is encriped', () => {
    const connection = {
      database: 'testDB',
      masterEncryption: true
    }

    const connectionTitle = component.getTitle(connection as any);
    expect(connectionTitle).toEqual('Untitled encrypted connection');
    expect(connectionTitle).not.toEqual('testDB');
  });
});
