import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef, Component, HostListener, NgZone } from '@angular/core';

import { Angulartics2Amplitude } from 'angulartics2';
import { AuthService } from './services/auth.service';
import { ConnectionsService } from './services/connections.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { TablesService } from './services/tables.service';
import { User } from '@sentry/angular';
import { UserService } from './services/user.service';
import amplitude from 'amplitude-js';
import { differenceInMilliseconds } from 'date-fns';
import { environment } from '../environments/environment';
import { interval } from 'rxjs';
import { normalizeTableName } from './lib/normalize';

//@ts-ignore
window.amplitude = amplitude;
amplitude.getInstance().init("9afd282be91f94da735c11418d5ff4f5");

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  userActivity;
  userInactive: Subject<any> = new Subject();
  chatHasBeenShownOnce: boolean = false;

  userLoggedIn = null;
  redirect_uri = `${location.origin}/loader`;
  connections = [];
  token = null;
  routePathParam;
  authBarTheme;
  activeLink: string;
  navigationTabs: object;
  currentUser: User;
  normalizedTableName;
  // upgradeButtonShown: boolean = true;

  // connectionID: string;

  constructor (
    private changeDetector: ChangeDetectorRef,
    private ngZone: NgZone,
    public route: ActivatedRoute,
    public router: Router,
    public _connections: ConnectionsService,
    public _user: UserService,
    public _auth: AuthService,
    private _tables: TablesService,
    angulartics2Amplitude: Angulartics2Amplitude,
    private domSanitizer: DomSanitizer,
    private matIconRegistry: MatIconRegistry,
  ) {
    this.matIconRegistry.addSvgIcon("mysql", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/mysql_logo.svg"));
    this.matIconRegistry.addSvgIcon("mssql", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/mssql_logo.svg"));
    this.matIconRegistry.addSvgIcon("oracledb", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/oracle_logo.svg"));
    this.matIconRegistry.addSvgIcon("postgres", this.domSanitizer.bypassSecurityTrustResourceUrl("/assets/icons/postgres_logo.svg"));
    angulartics2Amplitude.startTracking();

    // if (window.screen.width > 600) {
    //   this.userInactive.subscribe(() => {
    //     // @ts-ignore
    //     Intercom('show');
    //     this.chatHasBeenShownOnce = true;
    //   });
    // }
  }

  // setTimeout() {
  //   this.userActivity = setTimeout(() => this.userInactive.next(undefined), 15000);
  // }

  // @HostListener('window:click')
  // @HostListener('window:keypress')
  // refreshUserState() {
  //   clearTimeout(this.userActivity);
  //   if (!this.chatHasBeenShownOnce) this.setTimeout();
  // }

  ngOnInit() {
    // this.upgradeButtonShown = (environment as any).saas;

    this.navigationTabs = {
      'dashboard': {
        icon: 'dashboard',
        caption: 'Tables'
      },
      'audit': {
        icon: 'fact_check',
        caption: 'Audit'
      },
      'users': {
        icon: 'group',
        caption: 'Users'
      },
      'edit-db': {
        icon: 'edit',
        caption: 'Edit connection'
      },
      'connection-settings': {
        icon: 'settings',
        caption: 'Connection settings'
      }
    }

    document.cookie = "G_AUTH2_MIGRATION=informational";
    this._auth.cast.subscribe( res =>  {
      if (!res.isTemporary && res.expires) {
        console.log(res);
        const expirationTime = new Date(res.expires);
        if (expirationTime) localStorage.setItem('token_expiration', expirationTime.toString());

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
              this.router.navigate(['/connections-list'])
            }
        )

        const expirationInterval = differenceInMilliseconds(expirationTime, new Date());
        setTimeout(() => {
          this.logOut(true);
          this.router.navigate(['/login']);
        }, expirationInterval);

      } else if (res !== 'delete') {
        const expirationTime = new Date(localStorage.getItem('token_expiration'));
        const currantTime = new Date();

        if (expirationTime && currantTime) {
          const expirationInterval = differenceInMilliseconds(expirationTime, currantTime);
          if (expirationInterval > 0) {
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
                }
            );

            setTimeout(() => {
              this.logOut(true);
              this.router.navigate(['/login']);
            }, expirationInterval);
          }
        }
      }
      // else {
      //   this.router.navigate(['/login']);
      // }
    });

    this._user.cast.subscribe( arg => {
      if (arg === 'delete') {
        this.logOut(true);
      }
    })
  }

  get logo() {
    return this._connections.connectionLogo;
  }

  get name() {
    return this._connections.name;
  }

  get connectionID() {
    return this._connections.connectionID;
  }

  get currantConnection() {
    return this._connections.currentConnection;
  }

  get visibleTabs() {
    return this._connections.visibleTabs;
  }

  get currentTab() {
    return this._connections.currentTab;
  }

  get tableName() {
    this.normalizedTableName = normalizeTableName(this._tables.currentTableName);
    return this._tables.currentTableName;
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

    this.setUserLoggedIn(null);
    localStorage.removeItem('token_expiration');
    if ((environment as any).saas) {
      if (!isTokenExpired) window.location.href="https://rocketadmin.com/";
    } else {
      this.router.navigate(['/login'])
    }
  }
}
