import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ChangeDetectorRef, Component, HostListener, NgZone } from '@angular/core';
import { catchError, filter, map } from 'rxjs/operators';

import { Angulartics2Amplitude } from 'angulartics2';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { ConnectionsService } from './services/connections.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FeatureNotificationComponent } from './components/feature-notification/feature-notification.component';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatIconRegistry } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { TablesService } from './services/tables.service';
import { UiSettingsService } from './services/ui-settings.service';
import { User } from '@sentry/angular-ivy';
import { UserService } from './services/user.service';
import amplitude from 'amplitude-js';
import { differenceInMilliseconds } from 'date-fns';
import { environment } from '../environments/environment';
import { CompanyService } from './services/company.service';

//@ts-ignore
window.amplitude = amplitude;
amplitude.getInstance().init("9afd282be91f94da735c11418d5ff4f5");

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    FeatureNotificationComponent
  ],
})

export class AppComponent {

  public isSaas = (environment as any).saas;
  userActivity;
  userInactive: Subject<any> = new Subject();
  currentFeatureNotificationId: string = 'full-white-label';
  isFeatureNotificationShown: boolean = false;

  userLoggedIn = null;
  redirect_uri = `${location.origin}/loader`;
  connections = [];
  token = null;
  routePathParam;
  authBarTheme;
  activeLink: string;
  navigationTabs: object;
  currentUser: User;
  page: string;
  whiteLabelSettingsLoaded = false;
  whiteLabelSettings: {
    logo: string,
    favicon: string,
  } = {
    logo: '',
    favicon: ''
  }

  constructor (
    private changeDetector: ChangeDetectorRef,
    // private ngZone: NgZone,
    public route: ActivatedRoute,
    public router: Router,
    public _connections: ConnectionsService,
    public _company: CompanyService,
    public _user: UserService,
    public _auth: AuthService,
    private _tables: TablesService,
    private _uiSettings: UiSettingsService,
    angulartics2Amplitude: Angulartics2Amplitude,
    private domSanitizer: DomSanitizer,
    private matIconRegistry: MatIconRegistry,
  ) {
    this.matIconRegistry.addSvgIcon("mysql", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/mysql_logo.svg"));
    this.matIconRegistry.addSvgIcon("mssql", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/mssql_logo.svg"));
    this.matIconRegistry.addSvgIcon("oracledb", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/oracle_logo.svg"));
    this.matIconRegistry.addSvgIcon("postgres", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/postgres_logo.svg"));
    this.matIconRegistry.addSvgIcon("mongodb", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/mongodb_logo.svg"));
    this.matIconRegistry.addSvgIcon("dynamodb", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/dynamodb_logo.svg"));
    this.matIconRegistry.addSvgIcon("ibmdb2", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/db2.svg"));
    this.matIconRegistry.addSvgIcon("github", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/github.svg"));
    this.matIconRegistry.addSvgIcon("google", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/google.svg"));
    this.matIconRegistry.addSvgIcon("ai_rocket", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/ai-rocket.svg"));
    angulartics2Amplitude.startTracking();
  }

  ngOnInit() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.page = this.router.routerState.snapshot.url;
    })

    const expirationDateFromURL = new URLSearchParams(location.search).get('expires');

    if (expirationDateFromURL) {
      const expirationDateString = new Date(parseInt(expirationDateFromURL));
      localStorage.setItem('token_expiration', expirationDateString.toString());
    };

    const expirationToken = localStorage.getItem('token_expiration');

    if (!expirationToken) {
      this.setUserLoggedIn(false);
    }

    this.navigationTabs = {
      'dashboard': {
        caption: 'Tables'
      },
      'audit': {
        caption: 'Audit'
      },
      'permissions': {
        caption: 'Permissions'
      },
      'connection-settings': {
        caption: 'Connection settings'
      },
      'edit-db': {
        caption: 'Edit connection'
      },
    }

    document.cookie = "G_AUTH2_MIGRATION=informational";
    this._auth.cast.subscribe( res =>  {
      // app initialization after user logs in
      if (!res.isTemporary && res.expires) {
        const expirationTime = new Date(res.expires);
        if (expirationTime) localStorage.setItem('token_expiration', expirationTime.toString());

        this.router.navigate(['/connections-list']);

        this.initializeUserSession();

        const expirationInterval = differenceInMilliseconds(expirationTime, new Date());
        setTimeout(() => {
          this.logOut(true);
          this.router.navigate(['/login']);
        }, expirationInterval);

      }
      // app initialization if user is logged in (session restoration)
      if (expirationToken) {
        const expirationTime = expirationToken ? new Date(expirationToken) : null;
        const currantTime = new Date();

        if (expirationTime && currantTime) {
          const expirationInterval = differenceInMilliseconds(expirationTime, currantTime);
          console.log('expirationInterval', expirationInterval);
          if (expirationInterval > 0) {
            this.initializeUserSession();

            setTimeout(() => {
              if (this.userLoggedIn) this.logOut(true);
              this.router.navigate(['/login']);
            }, expirationInterval);
          } else {
            if (this.userLoggedIn) this.logOut(true);
            this.router.navigate(['/login']);
          }
        }
      }
    });

    this._user.cast.subscribe( arg => {
      if (arg === 'delete') {
        this.logOut(true);
      }
    })
  }

  get isCustomAccentedColor() {
    return this._connections.isCustomAccentedColor;
  }

  get connectionID() {
    return this._connections.connectionID;
  }

  get visibleTabs() {
    return this._connections.visibleTabs;
  }

  get currentTab() {
    return this._connections.currentTab;
  }

  initializeUserSession() {
    this._user.fetchUser()
    .subscribe((res: User) => {
        this.currentUser = res;
        this.setUserLoggedIn(true);
        // @ts-ignore
        if (typeof window.Intercom !== 'undefined') window.Intercom("boot", {
          // @ts-ignore
          ...window.intercomSettings,
          user_hash: res.intercom_hash,
          user_id: res.id,
          email: res.email
        });
        this._company.getWhiteLabelProperties(res.company.id).subscribe( whiteLabelSettings => {
          this.whiteLabelSettings.logo = whiteLabelSettings.logo;
          this.whiteLabelSettingsLoaded = true;

          if (whiteLabelSettings.favicon) {
            const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (link) {
              link.href = whiteLabelSettings.favicon;
            } else {
              const newLink = document.createElement('link');
              newLink.rel = 'icon';
              newLink.href = whiteLabelSettings.favicon;
              document.head.appendChild(newLink);
            }
          } else {
            const faviconIco = document.createElement('link');
            faviconIco.rel = 'icon';
            faviconIco.type = 'image/x-icon';
            faviconIco.href = 'assets/favicon.ico';

            const favicon16 = document.createElement('link');
            favicon16.rel = 'icon';
            favicon16.type = 'image/png';
            favicon16.setAttribute('sizes', '16x16');
            favicon16.href = 'assets/favicon-16x16.png';

            const favicon32 = document.createElement('link');
            favicon32.rel = 'icon';
            favicon32.type = 'image/png';
            favicon32.setAttribute('sizes', '32x32');
            favicon32.href = 'assets/favicon-32x32.png';

            document.head.appendChild(favicon16);
            document.head.appendChild(favicon32);
          }
        })
        this._uiSettings.getUiSettings().subscribe(settings => {
          this.isFeatureNotificationShown = (settings?.globalSettings?.lastFeatureNotificationId !== this.currentFeatureNotificationId)
        });
      }
  );
  }

  dismissFeatureNotification() {
    this._uiSettings.updateGlobalSetting('lastFeatureNotificationId', this.currentFeatureNotificationId)
    this.isFeatureNotificationShown = false;
  }

  setUserLoggedIn(state) {
    this.userLoggedIn = state;
    this.changeDetector.detectChanges();
  }

  logOut(isTokenExpired?: boolean) {
    try {
      // @ts-ignore
      google.accounts.id.revoke(this.currentUser.email, done => {
        console.log('consent revoked');
        console.log(done);
        console.log(this.currentUser.email);
      });
    } catch(error) {
      console.log('google error');
      console.log(error);
    }

    this._auth.logOutUser().subscribe(() => {
      this.setUserLoggedIn(null);
      localStorage.removeItem('token_expiration');

      if (this.isSaas) {
        if (!isTokenExpired) window.location.href="https://rocketadmin.com/";
      } else {
        this.router.navigate(['/login'])
      }
    });
  }
}
