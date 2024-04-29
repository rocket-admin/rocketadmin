import * as Sentry from "@sentry/angular-ivy";

import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { IColorConfig, NgxThemeModule } from "@brumeilde/ngx-theme";
import { Router, RouterModule } from '@angular/router';

import { AccountDeleteConfirmationComponent } from './components/user-settings/account-delete-confirmation/account-delete-confirmation.component';
import { AccountDeleteDialogComponent } from './components/user-settings/account-delete-dialog/account-delete-dialog.component';
import { ActionDeleteDialogComponent } from "./components/dashboard/db-table-actions/action-delete-dialog/action-delete-dialog.component";
import { AlertComponent } from './components/ui-components/alert/alert.component';
import { Angulartics2Module } from 'angulartics2';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuditComponent } from './components/audit/audit.component';
import { BannerComponent } from './components/ui-components/banner/banner.component';
import { Base64ValidationDirective } from "./directives/base64Validator.directive";
import { BbBulkActionConfirmationDialogComponent } from './components/dashboard/db-bulk-action-confirmation-dialog/db-bulk-action-confirmation-dialog.component';
import { BinaryDataCaptionFilterComponent } from './components/ui-components/filter-fields/binary-data-caption/binary-data-caption.component';
import { BinaryDataCaptionRowComponent } from './components/ui-components/row-fields/binary-data-caption/binary-data-caption.component';
import { BooleanFilterComponent } from './components/ui-components/filter-fields/boolean/boolean.component';
import { BooleanRowComponent } from './components/ui-components/row-fields/boolean/boolean.component';
import { BreadcrumbsComponent } from './components/ui-components/breadcrumbs/breadcrumbs.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { CompanyComponent } from './components/company/company.component';
import { CompanyMemberInvitationComponent } from './components/company-member-invitation/company-member-invitation.component';
import { ConfigModule } from './modules/config.module';
import { ConnectDBComponent } from './components/connect-db/connect-db.component';
import { ConnectionSettingsComponent } from "./components/connection-settings/connection-settings.component";
import { ConnectionsListComponent } from './components/connections-list/connections-list.component';
import { ConnectionsService } from './services/connections.service';
import { ContentLoaderComponent } from './components/ui-components/content-loader/content-loader.component';
import { CookieService } from 'ngx-cookie-service';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DateFilterComponent } from './components/ui-components/filter-fields/date/date.component';
import { DateRowComponent } from './components/ui-components/row-fields/date/date.component';
import { DateTimeFilterComponent } from './components/ui-components/filter-fields/date-time/date-time.component';
import { DateTimeRowComponent } from './components/ui-components/row-fields/date-time/date-time.component';
import { DbActionConfirmationDialogComponent } from './components/dashboard/db-action-confirmation-dialog/db-action-confirmation-dialog.component';
import { DbActionLinkDialogComponent } from './components/dashboard/db-action-link-dialog/db-action-link-dialog.component';
import { DbConnectionConfirmDialogComponent } from './components/connect-db/db-connection-confirm-dialog/db-connection-confirm-dialog.component';
import { DbConnectionDeleteDialogComponent } from './components/connect-db/db-connection-delete-dialog/db-connection-delete-dialog.component';
import { DbConnectionIpAccessDialogComponent } from './components/connect-db/db-connection-ip-access-dialog/db-connection-ip-access-dialog.component';
import { DbTableActionsComponent } from "./components/dashboard/db-table-actions/db-table-actions.component";
import { DbTableComponent } from './components/dashboard/db-table/db-table.component';
import { DbTableFiltersDialogComponent } from './components/dashboard/db-table-filters-dialog/db-table-filters-dialog.component';
import { DbTableRowEditComponent } from './components/db-table-row-edit/db-table-row-edit.component';
import { DbTableSettingsComponent } from './components/dashboard/db-table-settings/db-table-settings.component';
import { DbTableWidgetsComponent } from './components/dashboard/db-table-widgets/db-table-widgets.component';
import { DbTablesListComponent } from './components/dashboard/db-tables-list/db-tables-list.component';
import { DeleteMemberDialogComponent } from './components/company/delete-member-dialog/delete-member-dialog.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DynamicModule } from 'ng-dynamic-component';
import { EmailChangeComponent } from './components/email-change/email-change.component';
import { EmailValidationDirective } from "./directives/emailValidator.directive";
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { EnableTwoFADialogComponent } from './components/user-settings/enable-two-fa-dialog/enable-two-fa-dialog.component';
import { EncodeUrlParamsSafelyInterceptor } from './services/url-params.interceptor';
import { FileFilterComponent } from './components/ui-components/filter-fields/file/file.component';
import { FileRowComponent } from './components/ui-components/row-fields/file/file.component';
import { ForeignKeyFilterComponent } from './components/ui-components/filter-fields/foreign-key/foreign-key.component';
import { ForeignKeyRowComponent } from './components/ui-components/row-fields/foreign-key/foreign-key.component';
import { GroupAddDialogComponent } from './components/users/group-add-dialog/group-add-dialog.component';
import { GroupDeleteDialogComponent } from './components/users/group-delete-dialog/group-delete-dialog.component';
import { HexValidationDirective } from "./directives/hexValidator.directive";
import { HostnameValidationDirective } from "./directives/hostnameValidator.directive";
import { IconPickerComponent } from './components/ui-components/icon-picker/icon-picker.component';
import { IdFilterComponent } from "./components/ui-components/filter-fields/id/id.component";
import { IdRowComponent } from "./components/ui-components/row-fields/id/id.component";
import { InfoDialogComponent } from './components/audit/info-dialog/info-dialog.component';
import { InviteMemberDialogComponent } from './components/company/invite-member-dialog/invite-member-dialog.component';
import { IpAddressButtonComponent } from './components/ui-components/ip-address-button/ip-address-button.component';
import { JsonEditorFilterComponent } from './components/ui-components/filter-fields/json-editor/json-editor.component';
import { JsonEditorRowComponent } from './components/ui-components/row-fields/json-editor/json-editor.component';
import { LoginComponent } from './components/login/login.component';
import { LongTextFilterComponent } from './components/ui-components/filter-fields/long-text/long-text.component';
import { LongTextRowComponent } from './components/ui-components/row-fields/long-text/long-text.component';
import { MasterPasswordDialogComponent } from './components/master-password-dialog/master-password-dialog.component';
import { MaterialModule } from './modules/material.module';
import { NewVersionComponent } from './components/new-version/new-version.component';
import { NgmatTableQueryReflectorModule } from './modules/ngmat-table-query-reflector.module';
import { NgxStripeModule } from 'ngx-stripe';
import { NotificationsService } from './services/notifications.service';
import { NumberFilterComponent } from './components/ui-components/filter-fields/number/number.component';
import { NumberRowComponent } from './components/ui-components/row-fields/number/number.component';
import { PageLoaderComponent } from './components/page-loader/page-loader.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PasswordChangeComponent } from './components/password-change/password-change.component';
import { PasswordFilterComponent } from './components/ui-components/filter-fields/password/password.component';
import { PasswordRequestComponent } from './components/password-request/password-request.component';
import { PasswordResetComponent } from './components/password-reset/password-change.component';
import { PasswordRowComponent } from './components/ui-components/row-fields/password/password.component';
import { PasswordStrengthMeterModule } from 'angular-password-strength-meter';
import { PasswordValidationDirective } from "./directives/passwordValidator.directive";
import { PaymentFormComponent } from './components/payment-form/payment-form.component';
import { PermissionsAddDialogComponent } from './components/users/permissions-add-dialog/permissions-add-dialog.component';
import { PlaceholderAuditLogComponent } from './components/skeletons/placeholder-audit-log/placeholder-audit-log.component';
import { PlaceholderCompanyComponent } from './components/skeletons/placeholder-company/placeholder-company.component';
import { PlaceholderCompanyInvitationComponent } from './components/skeletons/placeholder-company-invitation/placeholder-company-invitation.component';
import { PlaceholderConnectionSettingsComponent } from './components/skeletons/placeholder-connection-settings/placeholder-connection-settings.component';
import { PlaceholderConnectionsComponent } from './components/skeletons/placeholder-connections/placeholder-connections.component';
import { PlaceholderRowEditComponent } from './components/skeletons/placeholder-row-edit/placeholder-row-edit.component';
import { PlaceholderTableDataComponent } from './components/skeletons/placeholder-table-data/placeholder-table-data.component';
import { PlaceholderTableSettingsComponent } from './components/skeletons/placeholder-table-settings/placeholder-table-settings.component';
import { PlaceholderTableViewComponent } from './components/skeletons/placeholder-table-view/placeholder-table-view.component';
import { PlaceholderTableWidgetsComponent } from './components/skeletons/placeholder-table-widgets/placeholder-table-widgets.component';
import { PlaceholderUserGroupComponent } from './components/skeletons/placeholder-user-group/placeholder-user-group.component';
import { PlaceholderUserGroupsComponent } from './components/skeletons/placeholder-user-groups/placeholder-user-groups.component';
import { PointFilterComponent } from './components/ui-components/filter-fields/point/point.component';
import { PointRowComponent } from './components/ui-components/row-fields/point/point.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { RevokeInvitationDialogComponent } from './components/company/revoke-invitation-dialog/revoke-invitation-dialog.component';
import { SelectFilterComponent } from './components/ui-components/filter-fields/select/select.component';
import { SelectRowComponent } from './components/ui-components/row-fields/select/select.component';
import { StaticTextFilterComponent } from './components/ui-components/filter-fields/static-text/static-text.component';
import { StaticTextRowComponent } from './components/ui-components/row-fields/static-text/static-text.component';
import { TablesService } from './services/tables.service';
import { TextFilterComponent } from './components/ui-components/filter-fields/text/text.component';
import { TextRowComponent } from './components/ui-components/row-fields/text/text.component';
import { TimeFilterComponent } from './components/ui-components/filter-fields/time/time.component';
import { TimeIntervalFilterComponent } from './components/ui-components/filter-fields/time-interval/time-interval.component';
import { TimeIntervalRowComponent } from './components/ui-components/row-fields/time-interval/time-interval.component';
import { TimeRowComponent } from './components/ui-components/row-fields/time/time.component';
import { TokenInterceptor } from './services/token.interceptor';
import { UpgradeComponent } from './components/upgrade/upgrade.component';
import { UpgradeSuccessComponent } from './components/upgrade-success/upgrade-success.component';
import { UserAddDialogComponent } from './components/users/user-add-dialog/user-add-dialog.component';
import { UserDeleteDialogComponent } from './components/users/user-delete-dialog/user-delete-dialog.component';
import { UserDeletedSuccessComponent } from './components/user-deleted-success/user-deleted-success.component';
import { UserPasswordComponent } from './components/ui-components/user-password/user-password.component';
import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { UsersComponent } from './components/users/users.component';
import { UsersService } from './services/users.service';
import { WidgetDeleteDialogComponent } from './components/dashboard/db-table-widgets/widget-delete-dialog/widget-delete-dialog.component';
import { environment } from '../environments/environment';
import { DbTableExportDialogComponent } from './components/dashboard/db-table-export-dialog/db-table-export-dialog.component';
import { DbTableRowViewComponent } from './components/dashboard/db-table-row-view/db-table-row-view.component';

type Palettes = { primaryPalette: string, accentedPalette: string, warnPalette: string };
type Colors = { myColorName: string };

const colorConfig: IColorConfig<Palettes, Colors> = {
  palettes: { primaryPalette: '#212121', accentedPalette: '#A63BFB', warnPalette: '#FB2424' },
  simpleColors: { myColorName: '#2e959a' },
};

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

// const saasExtraModules = (environment as any).saas ? [
//   SocialLoginModule,
// ] : [];

@NgModule({
  declarations: [
    AppComponent,
    ConnectDBComponent,
    DashboardComponent,
    DbTableComponent,
    PageNotFoundComponent,
    UsersComponent,
    DbTablesListComponent,
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
    DbActionConfirmationDialogComponent,
    BbBulkActionConfirmationDialogComponent,
    DbTableFiltersDialogComponent,
    AuditComponent,
    InfoDialogComponent,
    MasterPasswordDialogComponent,
    DbTableWidgetsComponent,
    WidgetDeleteDialogComponent,
    DbConnectionConfirmDialogComponent,
    RegistrationComponent,
    LoginComponent,
    HostnameValidationDirective,
    PasswordValidationDirective,
    Base64ValidationDirective,
    HexValidationDirective,
    EmailValidationDirective,
    BannerComponent,
    DbTableSettingsComponent,
    ConnectionSettingsComponent,
    UserSettingsComponent,
    UpgradeComponent,
    DbConnectionIpAccessDialogComponent,
    EmailVerificationComponent,
    EmailChangeComponent,
    PasswordResetComponent,
    AccountDeleteDialogComponent,
    PasswordRequestComponent,
    PasswordChangeComponent,
    AccountDeleteConfirmationComponent,
    AlertComponent,
    NewVersionComponent,
    UserDeletedSuccessComponent,
    IpAddressButtonComponent,
    BreadcrumbsComponent,
    DbTableActionsComponent,
    UserPasswordComponent,
    ActionDeleteDialogComponent,
    UpgradeSuccessComponent,
    DbActionLinkDialogComponent,
    PaymentFormComponent,
    EnableTwoFADialogComponent,
    IconPickerComponent,
    CompanyComponent,
    InviteMemberDialogComponent,
    CompanyMemberInvitationComponent,
    DeleteMemberDialogComponent,
    RevokeInvitationDialogComponent,
    PlaceholderConnectionsComponent,
    PlaceholderTableViewComponent,
    PlaceholderTableDataComponent,
    PlaceholderRowEditComponent,
    PlaceholderTableSettingsComponent,
    PlaceholderTableWidgetsComponent,
    PlaceholderUserGroupComponent,
    PlaceholderUserGroupsComponent,
    PlaceholderConnectionSettingsComponent,
    PlaceholderAuditLogComponent,
    PlaceholderCompanyComponent,
    PlaceholderCompanyInvitationComponent,
    BinaryDataCaptionRowComponent,
    BooleanRowComponent,
    BinaryDataCaptionFilterComponent,
    BooleanFilterComponent,
    DateRowComponent,
    DateTimeRowComponent,
    DateFilterComponent,
    DateTimeFilterComponent,
    FileRowComponent,
    ForeignKeyRowComponent,
    FileFilterComponent,
    ForeignKeyFilterComponent,
    IdRowComponent,
    IdFilterComponent,
    JsonEditorRowComponent,
    JsonEditorFilterComponent,
    LongTextRowComponent,
    LongTextFilterComponent,
    NumberRowComponent,
    NumberFilterComponent,
    PasswordRowComponent,
    PasswordFilterComponent,
    PointRowComponent,
    PointFilterComponent,
    SelectRowComponent,
    StaticTextRowComponent,
    SelectFilterComponent,
    StaticTextFilterComponent,
    TextRowComponent,
    TimeRowComponent,
    TimeIntervalRowComponent,
    TextFilterComponent,
    TimeFilterComponent,
    TimeIntervalFilterComponent,
    DbTableExportDialogComponent,
    DbActionConfirmationDialogComponent,
    BbBulkActionConfirmationDialogComponent,
    DbConnectionDeleteDialogComponent,
    GroupAddDialogComponent,
    UserAddDialogComponent,
    GroupDeleteDialogComponent,
    ContentLoaderComponent,
    DbTableRowViewComponent
  ],
  providers: [
    ConnectionsService,
    UsersService,
    NotificationsService,
    TablesService,
    CookieService,
    Title,
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
      provide: 'COLOR_CONFIG',
      useValue: colorConfig
    },
    {
      provide: 'THEME_OPTIONS',
      useValue: { frameworks: ['material'] }
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
    RouterModule,
    DynamicModule,
    NgmatTableQueryReflectorModule,
    NgJsonEditorModule,
    Angulartics2Module.forRoot(),
    ClipboardModule,
    DragDropModule,
    CodemirrorModule,
    PasswordStrengthMeterModule.forRoot(),
    // ...saasExtraModules,
    NgxThemeModule.forRoot(colorConfig, {
        frameworks: ['material'], // optional, default : ['tailwind', 'material']
    }),
    NgxStripeModule.forRoot('pk_live_51JM8FBFtHdda1TsBR7nieMFVFigZAUXbPhQTNvaSyLynIW1lbfzO6rfqqIUn0JAGJRq9mrwKwrVCsDDFOs84M7pE006xDqNgHk'),
    ConfigModule.buildForConfigUrl('/config.json')
  ],
  bootstrap: [AppComponent],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class AppModule { }
