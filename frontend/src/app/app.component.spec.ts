import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { Angulartics2Module } from 'angulartics2';
import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import { CompanyService } from './services/company.service';
import { ConnectionsService } from './services/connections.service';
// import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { TablesService } from './services/tables.service';
import { UiSettingsService } from './services/ui-settings.service';
import { UserService } from './services/user.service';
import { provideHttpClient } from '@angular/common/http';

describe('AppComponent', () => {
  let app: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  // let connectionsService: ConnectionsService;
  // let companyService: CompanyService;

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
    fetchUser: jasmine.createSpy('fetchUser').and.returnValue(of(fakeUser)),
    setIsDemo: jasmine.createSpy('setIsDemo'),
  };

  const mockCompanyService = {
    getWhiteLabelProperties: jasmine.createSpy('getWhiteLabelProperties')
  };

  const mockUiSettingsService = {
    getUiSettings: jasmine.createSpy('getUiSettings'),
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

    app.navigationTabs = {
      'dashboard': { caption: 'Tables' },
      'audit': { caption: 'Audit' },
      'permissions': { caption: 'Permissions' },
      'connection-settings': { caption: 'Connection settings' },
      'edit-db': { caption: 'Edit connection' },
    };

    fixture.detectChanges();

    spyOn(app, 'logOut');
    spyOn(app['router'], 'navigate');
  });

  afterEach(() => {
    localStorage.removeItem('token_expiration');
    (app.logOut as jasmine.Spy)?.calls.reset?.();
    (app['router'].navigate as jasmine.Spy)?.calls.reset?.();
    mockUiSettingsService.getUiSettings.calls.reset?.();
    mockCompanyService.getWhiteLabelProperties.calls.reset?.();
    mockUserService.fetchUser.calls.reset?.();
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should set userLoggedIn and logo on user session initialization', fakeAsync(() => {
    mockCompanyService.getWhiteLabelProperties.and.returnValue(of({logo: 'data:png;base64,some-base64-data'}));
    mockUiSettingsService.getUiSettings.and.returnValue(of({settings: {globalSettings: {lastFeatureNotificationId: 'old-id'}}}));
    app.initializeUserSession();
    tick();

    expect(app.currentUser.email).toBe('test@email.com');
    expect(app.whiteLabelSettings.logo).toBe('data:png;base64,some-base64-data');
    expect(app.userLoggedIn).toBeTrue();
    expect(mockUiSettingsService.getUiSettings).toHaveBeenCalled();
  }));

  it('should render custom logo in navbar if it is set', fakeAsync(() => {
    mockCompanyService.getWhiteLabelProperties.and.returnValue(of({logo: 'data:png;base64,some-base64-data'}));
    mockUiSettingsService.getUiSettings.and.returnValue(of({settings: {globalSettings: {lastFeatureNotificationId: 'old-id'}}}));
    app.initializeUserSession();
    tick();

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toEqual('data:png;base64,some-base64-data');
  }));

  it('should render the link to Connetions list that contains the custom logo in the navbar', fakeAsync(() => {
    mockCompanyService.getWhiteLabelProperties.and.returnValue(of({logo: null}));
    mockUiSettingsService.getUiSettings.and.returnValue(of({settings: {globalSettings: {lastFeatureNotificationId: 'old-id'}}}));
    app.initializeUserSession();
    tick();

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toContain('/assets/rocketadmin_logo_white.svg');
  }));

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

  it('should render feature popup if isFeatureNotificationShown different on server and client', fakeAsync(() => {
    app.currentFeatureNotificationId = 'new-id';
    mockCompanyService.getWhiteLabelProperties.and.returnValue(of({logo: null}));
    mockUiSettingsService.getUiSettings.and.returnValue(of({globalSettings: {lastFeatureNotificationId: 'old-id'}}));
    app.initializeUserSession();
    tick();

    fixture.detectChanges();
    const featureNotificationElement = fixture.debugElement.query(By.css('app-feature-notification'));

    expect(featureNotificationElement).toBeTruthy();
  }));

  it('should not render feature popup if isFeatureNotificationShown the same on server and client', fakeAsync(() => {
    app.currentFeatureNotificationId = 'old-id';
    mockCompanyService.getWhiteLabelProperties.and.returnValue(of({logo: null}));
    mockUiSettingsService.getUiSettings.and.returnValue(of({globalSettings: {lastFeatureNotificationId: 'old-id'}}));
    app.initializeUserSession();
    tick();

    fixture.detectChanges();
    const featureNotificationElement = fixture.debugElement.query(By.css('app-feature-notification'));

    expect(featureNotificationElement).toBeFalsy();
  }));

  it('should dismiss feature notification thus call updateGlobalSetting and hide feature notification', () => {
    app.currentFeatureNotificationId = 'some-id';
    app.isFeatureNotificationShown = true;

    app.dismissFeatureNotification();

    expect(mockUiSettingsService.updateGlobalSetting).toHaveBeenCalledWith(
      'lastFeatureNotificationId',
      'some-id'
    );

    expect(app.isFeatureNotificationShown).toBeFalse();
  });

  it('should set userLoggedIn state and trigger change detection', () => {
    const mockChangeDetectorRef = jasmine.createSpyObj<ChangeDetectorRef>(
      'ChangeDetectorRef',
      ['detectChanges', 'markForCheck', 'detach', 'checkNoChanges', 'reattach']
    );

    app['changeDetector'] = mockChangeDetectorRef; // inject mock manually if needed

    app.setUserLoggedIn(true);

    expect(app.userLoggedIn).toBeTrue();
    expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
  });

  it('should handle user login flow when cast emits user with expires', fakeAsync(() => {
    mockCompanyService.getWhiteLabelProperties.and.returnValue(of({logo: '', favicon: ''}));

    const expirationDate = new Date(Date.now() + 10_000); // 10s from now
    app['currentFeatureNotificationId'] = 'some-id';

    app.ngOnInit();

    mockAuthService.cast.next({
      isTemporary: false,
      expires: expirationDate.toISOString()
    });

    tick();
    fixture.detectChanges();

    expect(app.userLoggedIn).toBeTrue();
    expect(app.currentUser.email).toBe('test@email.com');
    expect(mockUserService.fetchUser).toHaveBeenCalled();
    expect(mockCompanyService.getWhiteLabelProperties).toHaveBeenCalledWith('company-12345678');
    expect(mockUiSettingsService.getUiSettings).toHaveBeenCalled();
    expect(app.isFeatureNotificationShown).toBeTrue();
  }));

  it('should restore session and log out after token expiration', fakeAsync(() => {
    const expiration = new Date(Date.now() + 5000); // 5s ahead
    localStorage.setItem('token_expiration', expiration.toString());

    spyOn(app, 'initializeUserSession').and.callFake(() => {
      app.userLoggedIn = true;
    });

    app.ngOnInit();
    mockAuthService.cast.next({ some: 'session' }); // not 'delete'

    tick();

    expect(app.initializeUserSession).toHaveBeenCalled();

    tick(5000);

    expect(app.logOut).toHaveBeenCalledWith(true);
    expect(app['router'].navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('should immediately log out and navigate to login if token is expired', fakeAsync(() => {
    const expiration = new Date(Date.now() - 5000); // Expired 5s ago
    localStorage.setItem('token_expiration', expiration.toString());

    spyOn(app, 'initializeUserSession');

    app.userLoggedIn = true;

    app.ngOnInit();

    mockAuthService.cast.next({ some: 'session' });

    tick();

    expect(app.initializeUserSession).not.toHaveBeenCalled();
    expect(app.logOut).toHaveBeenCalledWith(true);
    expect(app['router'].navigate).toHaveBeenCalledWith(['/login']);
  }));
});
