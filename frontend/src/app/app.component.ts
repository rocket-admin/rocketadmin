import { ChangeDetectorRef, Component, HostListener, NgZone } from '@angular/core';

import { ConnectionsService } from './services/connections.service';
import { UserService } from './services/user.service';
import { Angulartics2Amplitude } from 'angulartics2/amplitude';
import amplitude from 'amplitude-js';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { differenceInMilliseconds } from 'date-fns'
import { AuthService } from './services/auth.service';
import { SocialAuthService, FacebookLoginProvider, SocialUser } from '@abacritt/angularx-social-login';

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

  title = 'Autoadmin';
  userLoggedIn = null;
  redirect_uri = `${location.origin}/loader`;
  connections = [];
  token = null;
  routePathParam;
  authBarTheme;
  activeLink: string;
  navigationTabs: object;
  currentUser;

  // connectionID: string;

  constructor (
    private changeDetector: ChangeDetectorRef,
    private ngZone: NgZone,
    public route: ActivatedRoute,
    public router: Router,
    public _connections: ConnectionsService,
    public _user: UserService,
    public _auth: AuthService,
    angulartics2Amplitude: Angulartics2Amplitude,
    private domSanitizer: DomSanitizer,
    private matIconRegistry: MatIconRegistry,
    private socialAuthService: SocialAuthService
  ) {
    this.matIconRegistry.addSvgIcon("mysql", this.domSanitizer.bypassSecurityTrustResourceUrl("assets/icons/mysql_logo.svg"));
    this.matIconRegistry.addSvgIcon("mssql", this.domSanitizer.bypassSecurityTrustResourceUrl("assets/icons/mssql_logo.svg"));
    this.matIconRegistry.addSvgIcon("oracledb", this.domSanitizer.bypassSecurityTrustResourceUrl("assets/icons/oracle_logo.svg"));
    this.matIconRegistry.addSvgIcon("postgres", this.domSanitizer.bypassSecurityTrustResourceUrl("assets/icons/postgres_logo.svg"));
    angulartics2Amplitude.startTracking();
    if (window.screen.width > 600) {
      this.userInactive.subscribe(() => {
        // @ts-ignore
        customerly.open();
        this.chatHasBeenShownOnce = true;
      });
    }
  }

  setTimeout() {
    this.userActivity = setTimeout(() => this.userInactive.next(undefined), 15000);
  }

  @HostListener('window:click')
  @HostListener('window:keypress')
  refreshUserState() {
    clearTimeout(this.userActivity);
    if (!this.chatHasBeenShownOnce) this.setTimeout();
  }

  ngOnInit() {

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

    console.log(this.connectionID);

    // this.setTimeout();

    this._auth.cast.subscribe( res =>  {
      if (res.expires) {
        const expirationTime = new Date(res.expires).toString();
        if (expirationTime) localStorage.setItem('token_expiration', expirationTime);

        this._user.fetchUser()
          .subscribe(res => {
              this.currentUser = res;
              this.setUserLoggedIn(true);
              this.router.navigate(['/connections-list'])
            }
        )
      } else {
        const expirationTime = new Date(localStorage.getItem('token_expiration'));
        const currantTime = new Date();

        if (expirationTime && currantTime) {
          const expirationInterval = differenceInMilliseconds(expirationTime, currantTime);
          if (expirationInterval > 0) {
            this._user.fetchUser()
              .subscribe(res => {
                  this.currentUser = res;
                  this.setUserLoggedIn(true);
                }
            )
          }
        }
      }
    });

    // this.socialAuthService.authState.subscribe((authUser) => {
    //   // this.currentUser = authUser;
    //   // this.isSignedin = (user != null);
    //   this._user.fetchUser()
    //     .subscribe(res => {
    //         this.currentUser = res;
    //         this.setUserLoggedIn(true);
    //         console.log(res);
    //       }
    //   )
    //   console.log(authUser);
    // });

    this._user.cast.subscribe( arg => {
      if (arg === 'delete') {
        this.logOut();
      }
    })
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

  setUserLoggedIn(state) {
    this.userLoggedIn = state;
    this.changeDetector.detectChanges();
  }

  logOut() {
    this._auth.logOutUser()
      .subscribe(() => {
        this.socialAuthService.signOut();
        this.setUserLoggedIn(null);
        localStorage.removeItem('token_expiration');
        window.location.href="https://autoadmin.org/";
      })
  }
}
