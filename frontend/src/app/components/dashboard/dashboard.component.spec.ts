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

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  // let routerSpy;
  // let connectionsService: ConnectionsService;
  // let tablesService: TablesService;
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
    // routerSpy = {navigate: jasmine.createSpy('navigate')};
    fakeTablesService = jasmine.createSpyObj('tablesService', {fetchTables: of(fakeTables)});

    TestBed.configureTestingModule({
      declarations: [ DashboardComponent ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule
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
        { provide: Router, useValue: fakeRouter }
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
    spyOnProperty(fakeConnectionsSevice, 'currentConnectionAccessLevel', 'get').and.returnValue('readonly');
    expect(component.currentConnectionAccessLevel).toEqual('readonly');
  });

  xit('should redirect on first table, when no table-name in url param', async () => {
    spyOnProperty(fakeConnectionsSevice, 'currentConnectionID', 'get').and.returnValue('12345678');
    spyOn(component, 'getTables').and.returnValue(Promise.resolve(fakeTables));
    // fakeRouter.navigate.and.returnValue(Promise.resolve());
    // spyOn(component.router, 'navigate').and.returnValue(Promise.resolve());

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.connectionID).toEqual('12345678');
    expect(component.selectedTableName).toEqual('actor');
    // expect(fakeRouter.navigate).toHaveBeenCalledWith(['/dashboard/12345678/actor'], {replaceUrl: true});
  });

  it('should call getTables', async () => {
    // fakeTablesService.fetchTables.and.returnValue(of(fakeTables));
    const tables = await component.getTables();
    expect(tables).toEqual(fakeTables);
  });


});
