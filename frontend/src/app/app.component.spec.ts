import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { Angulartics2Module } from 'angulartics2';
import { AppComponent } from './app.component';
import { By } from '@angular/platform-browser';
import { ConnectionsService } from './services/connections.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { CompanyService } from './services/company.service';
import { UiSettingsService } from './services/ui-settings.service';
import { TablesService } from './services/tables.service';
// import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

fdescribe('AppComponent', () => {
  let app: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let connectionsService: ConnectionsService;
  let companyService: CompanyService;

  const fakeUser = {
    "id": "user-12345678",
    "createdAt": "2024-01-06T21:11:36.746Z",
    "suspended": false,
    "isActive": false,
    "email": "test@email.com",
    "intercom_hash": "intercom_hash-12345678",
    "name": null,
    "role": "ADMIN",
    "is_2fa_enabled": false,
    "company": {
      "id": "company-12345678"
    },
    "externalRegistrationProvider": null
  }

  const authCast = new Subject<any>();
  const userCast = new Subject<any>();

  const mockAuthService = {
    cast: authCast,
    logOutUser: jasmine.createSpy('logOutUser').and.returnValue(of(true))
  };

  const mockUserService = {
    cast: userCast,
    fetchUser: jasmine.createSpy('fetchUser').and.returnValue(of(fakeUser))
  };

  const mockCompanyService = {
    getCompanyLogo: jasmine.createSpy('getCompanyLogo')
  };

  const mockUiSettingsService = {
    getUiSettings: jasmine.createSpy('getUiSettings').and.returnValue(of({
      globalSettings: { lastFeatureNotificationId: 'old-id' }
    })),
    updateGlobalSetting: jasmine.createSpy('updateGlobalSetting')
  };

  const mockConnectionsService = {
    isCustomAccentedColor: true,
    connectionID: '123',
    visibleTabs: ['dashboard'],
    currentTab: 'dashboard'
  };

  const mockTablesService = {
    currentTableName: 'users'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        MatMenuModule,
        Angulartics2Module.forRoot(),
        AppComponent,
        BrowserAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: UiSettingsService, useValue: mockUiSettingsService },
        { provide: TablesService, useValue: mockTablesService },
        { provide: ConnectionsService, useValue: mockConnectionsService },
        // { provide: MatIconRegistry, useValue: {
        //   addSvgIcon: () => {},
        //   getDefaultFontSetClass: () => 'material-icons',
        //   getFontSetName: () => 'material-icons',
        //   getNamedSvgIcon: () => of(null), // only needed if you're testing SVG icons
        // }},
        { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: (url: string) => url } },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.debugElement.componentInstance;
    connectionsService = TestBed.inject(ConnectionsService);
    companyService = TestBed.inject(CompanyService);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  // it('should get logo url of current connection', () => {
  //   spyOn(companyService, 'getCompanyLogo').and.returnValue(of('data:png;base64,some-base64-data'));

  //   expect(app.logo).toEqual('data:png;base64,some-base64-data');
  // });

  it('should set userLoggedIn and logo on user session initialization', fakeAsync(() => {
    mockCompanyService.getCompanyLogo.and.returnValue(of('data:png;base64,some-base64-data'));
    app.initializeUserSession();
    tick();

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;

    expect(app.currentUser.email).toBe('test@email.com');
    expect(app.logo).toBe('data:png;base64,some-base64-data');
    expect(app.userLoggedIn).toBeTrue();
    expect(mockUiSettingsService.getUiSettings).toHaveBeenCalled();

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toEqual('data:png;base64,some-base64-data');
  }));

  it('should set userLoggedIn and logo on user session initialization', fakeAsync(() => {
    mockCompanyService.getCompanyLogo.and.returnValue(of('data:png;base64,some-base64-data'));
    app.initializeUserSession();
    tick();

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;

    expect(app.currentUser.email).toBe('test@email.com');
    expect(app.logo).toBe('data:png;base64,some-base64-data');
    expect(app.userLoggedIn).toBeTrue();
    expect(mockUiSettingsService.getUiSettings).toHaveBeenCalled();

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toEqual('data:png;base64,some-base64-data');
  }));

  xit('should render the link to Connetions list that contains the custom logo in the navbar', () => {
    spyOnProperty(app, 'connectionID', 'get').and.returnValue('12345678');
    app.currentUser = fakeUser;
    app.userLoggedIn = true;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toEqual('https://example.com/logo.png');
  });

  xit('should render the link to Connections list that contains Rocketadmin logo in the navbar', () => {
    app.currentUser = fakeUser;
    app.userLoggedIn = true;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toContain('/assets/rocketadmin_logo_white.svg');
  });

  it('should render the link to Home website page that contains Rocketadmin logo in the template', () => {
    app.userLoggedIn = false;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;
    const nameElement = fixture.debugElement.query(By.css('span[data-id="connection-custom-name"]'));

    expect(logoElement.href).toEqual('https://rocketadmin.com/');
    expect(logoImageElement.src).toContain('/assets/rocketadmin_logo_white.svg');
    expect(nameElement).toBeFalsy();
  });
});
