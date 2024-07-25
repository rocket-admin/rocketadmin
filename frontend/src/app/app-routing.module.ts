import { RouterModule, Routes } from '@angular/router';

import { AuditComponent } from './components/audit/audit.component';
import { AuthGuard } from './auth.guard';
import { CompanyComponent } from './components/company/company.component';
import { CompanyMemberInvitationComponent } from './components/company-member-invitation/company-member-invitation.component';
import { ConnectDBComponent } from './components/connect-db/connect-db.component'
import { ConnectionSettingsComponent } from './components/connection-settings/connection-settings.component';
import { ConnectionsListComponent } from './components/connections-list/connections-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component'
import { DbTableActionsComponent } from './components/dashboard/db-table-actions/db-table-actions.component';
import { DbTableComponent } from './components/dashboard/db-table/db-table.component';
import { DbTableRowEditComponent } from './components/db-table-row-edit/db-table-row-edit.component';
import { DbTableSettingsComponent } from './components/dashboard/db-table-settings/db-table-settings.component';
import { DbTableWidgetsComponent } from './components/dashboard/db-table-widgets/db-table-widgets.component';
import { EmailChangeComponent } from './components/email-change/email-change.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { LoginComponent } from './components/login/login.component';
import { NewVersionComponent } from './components/new-version/new-version.component';
import { NgModule } from '@angular/core';
import { PageLoaderComponent } from './components/page-loader/page-loader.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PasswordChangeComponent } from './components/password-change/password-change.component';
import { PasswordRequestComponent } from './components/password-request/password-request.component';
import { PasswordResetComponent } from './components/password-reset/password-change.component';
import { PaymentFormComponent } from './components/payment-form/payment-form.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { UpgradeComponent } from './components/upgrade/upgrade.component';
import { UpgradeSuccessComponent } from './components/upgrade-success/upgrade-success.component';
import { UserDeletedSuccessComponent } from './components/user-deleted-success/user-deleted-success.component';
import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { UsersComponent } from './components/users/users.component';

const routes: Routes = [
  {path: '', redirectTo: '/connections-list', pathMatch: 'full'},
  {path: 'loader', component: PageLoaderComponent},
  {path: 'registration', component: RegistrationComponent, title: 'Sign up | Rocketadmin'},
  {path: 'login', component: LoginComponent, title: 'Login | Rocketadmin'},
  {path: 'forget-password', component: PasswordRequestComponent, title: 'Request password | Rocketadmin'},
  {path: 'external/user/password/reset/verify/:verification-token', component: PasswordResetComponent, title: 'Reset password | Rocketadmin'},
  {path: 'external/user/email/verify/:verification-token', component: EmailVerificationComponent, title: 'Email verification | Rocketadmin'},
  {path: 'external/user/email/change/verify/:change-token', component: EmailChangeComponent, title: 'Email updating | Rocketadmin'},
  {path: 'deleted', component: UserDeletedSuccessComponent, title: 'User deleted | Rocketadmin'},
  {path: 'new-version', component: NewVersionComponent, title: 'New version | Rocketadmin'},
  {path: 'connect-db', component: ConnectDBComponent, canActivate: [AuthGuard], title: 'Add new database | Rocketadmin'},
  {path: 'connections-list', component: ConnectionsListComponent, canActivate: [AuthGuard], title: 'Connections | Rocketadmin'},
  {path: 'user-settings', component: UserSettingsComponent, canActivate: [AuthGuard], title: 'User settings | Rocketadmin'},
  {path: 'company', component: CompanyComponent, canActivate: [AuthGuard], title: 'Company settings | Rocketadmin'},
  {path: 'company/:company-id/verify/:verification-token', component: CompanyMemberInvitationComponent, title: 'Invitation | Rocketadmin'},
  {path: 'change-password', component: PasswordChangeComponent, canActivate: [AuthGuard]},
  {path: 'upgrade', component: UpgradeComponent, canActivate: [AuthGuard], title: 'Upgrade | Rocketadmin'},
  {path: 'upgrade/payment', component: PaymentFormComponent, canActivate: [AuthGuard], title: 'Payment | Rocketadmin'},
  {path: 'subscription/success', component: UpgradeSuccessComponent, canActivate: [AuthGuard], title: 'Upgraded successfully | Rocketadmin'},
  {path: 'edit-db/:connection-id', component: ConnectDBComponent, canActivate: [AuthGuard]},
  {path: 'connection-settings/:connection-id', component: ConnectionSettingsComponent, canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: 'audit/:connection-id', component: AuditComponent, canActivate: [AuthGuard]},
  // {path: 'dashboard/:connection-id', component: DashboardComponent,
  //   children: [
  //     {path: ':id', component: DbTableComponent}
  //   ]
  // },
  {path: 'dashboard/:connection-id/:table-name', pathMatch: 'full', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/entry', pathMatch: 'full', component: DbTableRowEditComponent, canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/widgets', pathMatch: 'full', component: DbTableWidgetsComponent, canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/settings', pathMatch: 'full', component: DbTableSettingsComponent, canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/actions', pathMatch: 'full', component: DbTableActionsComponent, canActivate: [AuthGuard]},
  {path: 'permissions/:connection-id', component: UsersComponent, canActivate: [AuthGuard]},
  {path: '**', component: PageNotFoundComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
