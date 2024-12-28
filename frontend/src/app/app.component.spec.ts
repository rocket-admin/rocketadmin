import { ComponentFixture, TestBed } from '@angular/core/testing';
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

describe('AppComponent', () => {
  let app: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let connectionsService: ConnectionsService;

  // const fakeConnectionsSevice = {
  //   get logo(): string {
  //     return ''
  //   },
  // };

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
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.debugElement.componentInstance;
    connectionsService = TestBed.inject(ConnectionsService);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('should get logo url of current connection', () => {
    spyOnProperty(app, 'logo', 'get').and.returnValue('https://example.com/logo.png');
    expect(app.logo).toEqual('https://example.com/logo.png');
  });

  it('should get name of current connection', () => {
    spyOnProperty(app, 'name', 'get').and.returnValue('My connection');
    expect(app.name).toEqual('My connection');
  });

  it('should render the link to Dashboard that contains the logo and the custom name in the template', () => {
    spyOnProperty(app, 'logo', 'get').and.returnValue('https://example.com/logo.png');
    spyOnProperty(app, 'name', 'get').and.returnValue('My connection');
    spyOnProperty(app, 'connectionID', 'get').and.returnValue('12345678');
    app.currentUser = fakeUser;
    app.userLoggedIn = true;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;
    const nameElement = fixture.debugElement.query(By.css('span[data-id="connection-custom-name"]')).nativeElement;

    expect(logoElement.href).toContain('/dashboard/12345678');
    expect(logoImageElement.src).toEqual('https://example.com/logo.png');
    expect(nameElement.innerText).toEqual('My connection');
  });

  it('should render the link to Dashboard that contains the logo without the custom name in the template', () => {
    spyOnProperty(app, 'logo', 'get').and.returnValue('https://example.com/logo.png');
    spyOnProperty(app, 'connectionID', 'get').and.returnValue('12345678');
    app.currentUser = fakeUser;
    app.userLoggedIn = true;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;
    const nameElement = fixture.debugElement.query(By.css('span[data-id="connection-custom-name"]'));

    expect(logoElement.href).toContain('/dashboard/12345678');
    expect(logoImageElement.src).toEqual('https://example.com/logo.png');
    expect(nameElement).toBeFalsy();
  });

  it('should render the link to Dashboard that contains the custom name and mini Rocketadmin logo in the template', () => {
    spyOnProperty(app, 'name', 'get').and.returnValue('My connection');
    spyOnProperty(app, 'connectionID', 'get').and.returnValue('12345678');
    app.currentUser = fakeUser;
    app.userLoggedIn = true;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;
    const nameElement = fixture.debugElement.query(By.css('span[data-id="connection-custom-name"]')).nativeElement;

    expect(logoElement.href).toContain('/dashboard/12345678');
    expect(logoImageElement.src).toContain('/assets/rocketadmin_logo_white-short.svg');
    expect(nameElement.innerText).toEqual('My connection');
  });

  it('should render the link to Connections list that contains Rocketadmin logo in the template', () => {
    app.currentUser = fakeUser;
    app.userLoggedIn = true;

    fixture.detectChanges();
    const logoElement = fixture.debugElement.query(By.css('.logo')).nativeElement;
    const logoImageElement = fixture.debugElement.query(By.css('.logo__image')).nativeElement;
    const nameElement = fixture.debugElement.query(By.css('span[data-id="connection-custom-name"]'));

    expect(logoElement.href).toContain('/connections-list');
    expect(logoImageElement.src).toContain('/assets/rocketadmin_logo_white.svg');
    expect(nameElement).toBeFalsy();
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
