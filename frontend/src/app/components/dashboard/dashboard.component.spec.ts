import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { DashboardComponent } from './dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { ConnectionsService } from 'src/app/services/connections.service';
import { of } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { AccessLevel } from 'src/app/models/user';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Angulartics2, Angulartics2Module } from 'angulartics2';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let fakeTablesService;

  const fakeConnectionsSevice = {
    get currentConnectionID(): string {
      return ''
    },
    get currentConnectionAccessLevel(): AccessLevel {
      return AccessLevel.None;
    }
  };
  const fakeRouter = jasmine.createSpyObj('Router', {navigate: Promise.resolve('')});

  const fakeTables = [
    {
      "table": "actor",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      }
    },
    {
      "table": "city",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      }
    },
    {
      "table": "film",
      "permissions": {
        "visibility": true,
        "readonly": false,
        "add": true,
        "delete": true,
        "edit": true
      }
    }
  ]

  beforeEach(async(() => {

    // const paramMapSubject = new BehaviorSubject(convertToParamMap({
    //   'table-name': undefined
    // }));

    const angulartics2Mock = {
      eventTrack: {
        next: () => {} // Mocking the next method
      },
      trackLocation: () => {} // Mocking the trackLocation method
    };

    fakeTablesService = jasmine.createSpyObj('tablesService', {fetchTables: of(fakeTables)});

    TestBed.configureTestingModule({
      declarations: [ DashboardComponent ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
        {
          provide: ConnectionsService,
          useValue: fakeConnectionsSevice
        },
        {
          provide: TablesService,
          useValue: fakeTablesService
        },
        { provide: ActivatedRoute,
          useValue: {paramMap: of(convertToParamMap({
                'table-name': undefined
              })
            ),
          }
        },
        { provide: Router, useValue: fakeRouter },
        { provide: Angulartics2, useValue: angulartics2Mock }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get access level of current connection', () => {
    spyOnProperty(fakeConnectionsSevice, 'currentConnectionAccessLevel', 'get').and.returnValue(AccessLevel.Readonly);
    expect(component.currentConnectionAccessLevel).toEqual('readonly');
  });

  it('should call getTables', async () => {
    fakeTablesService.fetchTables.and.returnValue(of(fakeTables));
    const tables = await component.getTables();
    expect(tables).toEqual(fakeTables);
  });


});
