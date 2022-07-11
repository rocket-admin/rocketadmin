import * as Sentry from "@sentry/angular";

import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthServiceConfig, SocialLoginModule } from '@abacritt/angularx-social-login';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { AccountDeleteConfirmationComponent } from './components/user-settings/account-delete-confirmation/account-delete-confirmation.component';
import { AccountDeleteDialogComponent } from './components/user-settings/account-delete-dialog/account-delete-dialog.component';
import { Angulartics2Module } from 'angulartics2';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuditComponent } from './components/audit/audit.component';
import { BannerComponent } from './components/ui-components/banner/banner.component';
import { BinaryDataCaptionComponent } from './components/ui-components/row-fields/binary-data-caption/binary-data-caption.component';
import { BooleanComponent } from './components/ui-components/row-fields/boolean/boolean.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { ConfigModule } from './modules/config.module';
import { ConnectDBComponent } from './components/connect-db/connect-db.component';
import { ConnectionSettingsComponent } from "./components/connection-settings/connection-settings.component";
import { ConnectionsListComponent } from './components/connections-list/connections-list.component';
import { ConnectionsService } from './services/connections.service';
import { ContentLoaderComponent } from './components/ui-components/content-loader/content-loader.component';
import { CookieService } from 'ngx-cookie-service';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DateComponent } from './components/ui-components/row-fields/date/date.component';
import { DateTimeComponent } from './components/ui-components/row-fields/date-time/date-time.component';
import { DbConnectionConfirmDialogComponent } from './components/connect-db/db-connection-confirm-dialog/db-connection-confirm-dialog.component';
import { DbConnectionDeleteDialogComponent } from './components/connect-db/db-connection-delete-dialog/db-connection-delete-dialog.component';
import { DbConnectionIpAccessDialogComponent } from './components/connect-db/db-connection-ip-access-dialog/db-connection-ip-access-dialog.component';
import { DbRowDeleteDialogComponent } from './components/dashboard/db-row-delete-dialog/db-row-delete-dialog.component';
import { DbTableComponent } from './components/dashboard/db-table/db-table.component';
import { DbTableFiltersDialogComponent } from './components/dashboard/db-table-filters-dialog/db-table-filters-dialog.component';
import { DbTableRowEditComponent } from './components/db-table-row-edit/db-table-row-edit.component';
import { DbTableSettingsComponent } from './components/dashboard/db-table-settings/db-table-settings.component';
import { DbTableWidgetsComponent } from './components/dashboard/db-table-widgets/db-table-widgets.component';
import { DbTablesListComponent } from './components/dashboard/db-tables-list/db-tables-list.component';
import { DynamicModule } from 'ng-dynamic-component';
import { EmailChangeComponent } from './components/email-change/email-change.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { EncodeUrlParamsSafelyInterceptor } from './services/url-params.interceptor';
import { ForeignKeyComponent } from './components/ui-components/row-fields/foreign-key/foreign-key.component';
import { GroupAddDialogComponent } from './components/users/group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './components/users/group-delete-dialog/group-delete-dialog.component';
import { GroupUserVerificationComponent } from './components/group-user-verification/group-user-verification.component';
import { HomeComponent } from './components/home/home.component';
import { HostnameValidationDirective } from "./directives/hostnameValidator.directive";
import { IdComponent } from "./components/ui-components/row-fields/id/id.component";
import { InfoDialogComponent } from './components/audit/info-dialog/info-dialog.component';
import { JsonEditorComponent } from './components/ui-components/row-fields/json-editor/json-editor.component';
import { LoginComponent } from './components/login/login.component';
import { LongTextComponent } from './components/ui-components/row-fields/long-text/long-text.component';
import { MasterPasswordDialogComponent } from './components/master-password-dialog/master-password-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { MaterialModule } from './modules/material.module';
import { NgJsonEditorModule } from 'ang-jsoneditor'
import { NgmatTableQueryReflectorModule } from '@nghacks/ngmat-table-query-reflector';
import { NotificationsService } from './services/notifications.service';
import { NumberComponent } from './components/ui-components/row-fields/number/number.component';
import { PageLoaderComponent } from './components/page-loader/page-loader.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PasswordChangeComponent } from './components/password-change/password-change.component';
import { PasswordComponent } from './components/ui-components/row-fields/password/password.component';
import { PasswordRequestComponent } from './components/password-request/password-request.component';
import { PasswordResetComponent } from './components/password-reset/password-change.component';
import { PasswordValidationDirective } from "./directives/passwordValidator.directive";
import { PermissionsAddDialogComponent } from './components/users/permissions-add-dialog/permissions-add-dialog.component';
import { PointComponent } from './components/ui-components/row-fields/point/point.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { SelectComponent } from './components/ui-components/row-fields/select/select.component';
import { StaticTextComponent } from './components/ui-components/row-fields/static-text/static-text.component';
import { TablesService } from './services/tables.service';
import { TextComponent } from './components/ui-components/row-fields/text/text.component';
import { TimeComponent } from './components/ui-components/row-fields/time/time.component';
import { TimeIntervalComponent } from './components/ui-components/row-fields/time-interval/time-interval.component';
import { TokenInterceptor } from './services/token.interceptor';
import { UpgradeComponent } from './components/upgrade/upgrade.component';
import { UserAddDialogComponent } from './components/users/user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './components/users/user-delete-dialog/user-delete-dialog.component';
import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { UsersComponent } from './components/users/users.component';
import { UsersService } from './services/users.service';
import { WidgetDeleteDialogComponent } from './components/dashboard/db-table-widgets/widget-delete-dialog/widget-delete-dialog.component';
import { environment } from '../environments/environment';
import { FileComponent } from './components/ui-components/row-fields/file/file.component';

const saasExtraProviders = (environment as any).saas ? [
  {
    provide: Sentry.TraceService,
    deps: [Router],
  },
  {
    provide: ErrorHandler,
    useValue: Sentry.createErrorHandler({
      showDialog: true,
    }),
  },
] : [];

const saasExtraModules = (environment as any).saas ? [
  SocialLoginModule,
] : [];

@NgModule({
  declarations: [
    AppComponent,
    ConnectDBComponent,
    DashboardComponent,
    DbTableComponent,
    PageNotFoundComponent,
    UsersComponent,
    DbTablesListComponent,
    HomeComponent,
    PageLoaderComponent,
    DbConnectionDeleteDialogComponent,
    ConnectionsListComponent,
    GroupAddDialogComponent,
    UserAddDialogComponent,
    GroupDeleteDialogComponent,
    ContentLoaderComponent,
    UserDeleteDialogComponent,
    PermissionsAddDialogComponent,
    DbTableRowEditComponent,
    NumberComponent,
    TextComponent,
    PointComponent,
    DbRowDeleteDialogComponent,
    BooleanComponent,
    LongTextComponent,
    DateComponent,
    StaticTextComponent,
    BinaryDataCaptionComponent,
    DateTimeComponent,
    TimeComponent,
    TimeIntervalComponent,
    ForeignKeyComponent,
    SelectComponent,
    DbTableFiltersDialogComponent,
    AuditComponent,
    InfoDialogComponent,
    JsonEditorComponent,
    MasterPasswordDialogComponent,
    DbTableWidgetsComponent,
    WidgetDeleteDialogComponent,
    PasswordComponent,
    DbConnectionConfirmDialogComponent,
    RegistrationComponent,
    LoginComponent,
    HostnameValidationDirective,
    PasswordValidationDirective,
    BannerComponent,
    DbTableSettingsComponent,
    ConnectionSettingsComponent,
    UserSettingsComponent,
    UpgradeComponent,
    DbConnectionIpAccessDialogComponent,
    IdComponent,
    EmailVerificationComponent,
    EmailChangeComponent,
    PasswordResetComponent,
    AccountDeleteDialogComponent,
    PasswordRequestComponent,
    PasswordChangeComponent,
    AccountDeleteConfirmationComponent,
    GroupUserVerificationComponent,
    FileComponent
  ],
  entryComponents: [
    DbRowDeleteDialogComponent,
    DbConnectionDeleteDialogComponent,
    GroupAddDialogComponent,
    UserAddDialogComponent,
    GroupDeleteDialogComponent,
    ContentLoaderComponent
  ],
  providers: [
    ConnectionsService,
    UsersService,
    NotificationsService,
    TablesService,
    CookieService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: EncodeUrlParamsSafelyInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: (environment as any).saas ? [Sentry.TraceService] : [],
      multi: true,
    },
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: (environment as any).saas ? [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '600913874691-spojhqmeasej8692gjkuedqpk0ad24ng.apps.googleusercontent.com'
            )
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider('2931389687130672')
          }
        ] : [],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig,
    },
    ... saasExtraProviders
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    MatMenuModule,
    RouterModule,
    DynamicModule,
    NgmatTableQueryReflectorModule,
    NgJsonEditorModule,
    Angulartics2Module.forRoot(),
    ...saasExtraModules,
    ConfigModule.buildForConfigUrl('/config.json')
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
