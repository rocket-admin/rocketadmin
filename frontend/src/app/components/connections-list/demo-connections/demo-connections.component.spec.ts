import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemoConnectionsComponent } from './demo-connections.component';
import { ConnectionItem, DBtype, ConnectionType } from 'src/app/models/connection';
import { AccessLevel } from 'src/app/models/user';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';

describe('DemoConnectionsComponent', () => {
  let component: DemoConnectionsComponent;
  let fixture: ComponentFixture<DemoConnectionsComponent>;

  const mockTestConnections: ConnectionItem[] = [
    {
      connection: {
        id: '1',
        title: 'MySQL Test DB',
        type: DBtype.MySQL,
        database: 'test_db',
        host: 'localhost',
        port: '3306',
        username: 'root',
        password: 'password',
        schema: null,
        sid: null,
        ssl: false,
        ssh: false,
        connectionType: ConnectionType.Direct,
        masterEncryption: false,
        azure_encryption: false,
        isTestConnection: true,
        cert: ''
      },
      accessLevel: AccessLevel.None
    },
    {
      connection: {
        id: '2',
        title: 'PostgreSQL Test DB',
        type: DBtype.Postgres,
        database: 'test_db',
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'password',
        schema: null,
        sid: null,
        ssl: false,
        ssh: false,
        connectionType: ConnectionType.Direct,
        masterEncryption: false,
        azure_encryption: false,
        isTestConnection: true,
        cert: ''
      },
      accessLevel: AccessLevel.None
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Angulartics2Module.forRoot({}),
        DemoConnectionsComponent
      ],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemoConnectionsComponent);
    component = fixture.componentInstance;
    component.testConnections = mockTestConnections;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should order test databases according to supportedOrderedDatabases', () => {
    // Call the method directly
    const orderedConnections = component.orderTestDatabases();

    // Verify the result is an array
    expect(Array.isArray(orderedConnections)).toBe(true);

    // Verify the connections are in the right order
    expect(orderedConnections.length).toBe(2);
    expect(orderedConnections[0].connection.type).toBe(DBtype.MySQL);
    expect(orderedConnections[1].connection.type).toBe(DBtype.Postgres);
  });

  it('should handle empty or null testConnections', () => {
    // Set testConnections to null
    component.testConnections = null;
    fixture.detectChanges();

    // Call the method
    const result = component.orderTestDatabases();

    // Verify it returns an empty array
    expect(result).toEqual([]);

    // Set testConnections to empty array
    component.testConnections = [];
    fixture.detectChanges();

    // Call the method again
    const resultForEmpty = component.orderTestDatabases();

    // Verify it returns an empty array
    expect(resultForEmpty).toEqual([]);
  });
});
