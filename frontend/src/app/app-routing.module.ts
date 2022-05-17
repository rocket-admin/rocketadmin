import { RouterModule, Routes } from '@angular/router';

import { AuditComponent } from './components/audit/audit.component';
import { AuthGuard } from './auth.guard';
import { ConnectDBComponent } from './components/connect-db/connect-db.component'
import { ConnectionSettingsComponent } from './components/connection-settings/connection-settings.component';
import { ConnectionsListComponent } from './components/connections-list/connections-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component'
import { DbTableComponent } from './components/dashboard/db-table/db-table.component';
import { DbTableRowEditComponent } from './components/db-table-row-edit/db-table-row-edit.component';
import { DbTableSettingsComponent } from './components/dashboard/db-table-settings/db-table-settings.component';
import { DbTableWidgetsComponent } from './components/dashboard/db-table-widgets/db-table-widgets.component';
import { EmailChangeComponent } from './components/email-change/email-change.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { NgModule } from '@angular/core';
import { PageLoaderComponent } from './components/page-loader/page-loader.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PasswordChangeComponent } from './components/password-change/password-change.component';
import { PasswordRequestComponent } from './components/password-request/password-request.component';
import { PasswordResetComponent } from './components/password-reset/password-change.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { UpgradeComponent } from './components/upgrade/upgrade.component';
import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { UsersComponent } from './components/users/users.component';

const routes: Routes = [
  {path: '', redirectTo: '/home', pathMatch: 'full'},
  {path: 'home', component: HomeComponent},
  {path: 'loader', component: PageLoaderComponent},
  {path: 'registration', component: RegistrationComponent},
  {path: 'login', component: LoginComponent},
  {path: 'forget-password', component: PasswordRequestComponent},
  {path: 'api/user/password/reset/verify/:verification-token', component: PasswordResetComponent},
  {path: 'api/user/email/verify/:verification-token', component: EmailVerificationComponent},
  {path: 'api/user/email/change/verify/:change-token', component: EmailChangeComponent},
  {path: 'connect-db', component: ConnectDBComponent, canActivate: [AuthGuard]},
  {path: 'connections-list', component: ConnectionsListComponent, canActivate: [AuthGuard]},
  {path: 'user-settings', component: UserSettingsComponent, canActivate: [AuthGuard]},
  {path: 'change-password', component: PasswordChangeComponent, canActivate: [AuthGuard]},
  {path: 'upgrade', component: UpgradeComponent, canActivate: [AuthGuard]},
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
  {path: 'users/:connection-id', component: UsersComponent, canActivate: [AuthGuard]},
  {path: '**', component: PageNotFoundComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
