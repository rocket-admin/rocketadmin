import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {path: '', redirectTo: '/connections-list', pathMatch: 'full'},
  {path: 'loader', loadComponent: () => import('./components/page-loader/page-loader.component').then(m => m.PageLoaderComponent)},
  {path: 'registration', loadChildren: () => import('./routes/registration.routes').then(m => m.REGISTRATION_ROUTES)},
  {path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent), title: 'Login | Rocketadmin'},
  {path: 'forget-password', loadComponent: () => import('./components/password-request/password-request.component').then(m => m.PasswordRequestComponent), title: 'Request password | Rocketadmin'},
  {path: 'external/user/password/reset/verify/:verification-token', loadChildren: () => import('./routes/password-reset.routes').then(m => m.PASSWORD_RESET_ROUTES)},
  {path: 'external/user/email/verify/:verification-token', loadComponent: () => import('./components/email-verification/email-verification.component').then(m => m.EmailVerificationComponent), title: 'Email verification | Rocketadmin'},
  {path: 'external/user/email/change/verify/:change-token', loadComponent: () => import('./components/email-change/email-change.component').then(m => m.EmailChangeComponent), title: 'Email updating | Rocketadmin'},
  {path: 'deleted', loadComponent: () => import('./components/user-deleted-success/user-deleted-success.component').then(m => m.UserDeletedSuccessComponent), title: 'User deleted | Rocketadmin'},
  {path: 'connect-db', loadComponent: () => import('./components/connect-db/connect-db.component').then(m => m.ConnectDBComponent), canActivate: [AuthGuard]},
  {path: 'connections-list', loadComponent: () => import('./components/connections-list/connections-list.component').then(m => m.ConnectionsListComponent), canActivate: [AuthGuard]},
  {path: 'user-settings', loadComponent: () => import('./components/user-settings/user-settings.component').then(m => m.UserSettingsComponent), canActivate: [AuthGuard]},
  // company routes have to be in this specific order
  {path: 'company/:company-id/verify/:verification-token', pathMatch: 'full', loadChildren: () => import('./routes/company-invitation.routes').then(m => m.COMPANY_INVITATION_ROUTES)},
  {path: 'company', pathMatch: 'full', loadComponent: () => import('./components/company/company.component').then(m => m.CompanyComponent), canActivate: [AuthGuard]},
  {path: 'secrets', pathMatch: 'full', loadComponent: () => import('./components/secrets/secrets.component').then(m => m.SecretsComponent), canActivate: [AuthGuard], title: 'Secrets | Rocketadmin'},
  {path: 'sso/:company-id', pathMatch: 'full', loadComponent: () => import('./components/sso/sso.component').then(m => m.SsoComponent), canActivate: [AuthGuard]},
  {path: 'change-password', loadChildren: () => import('./routes/password-change.routes').then(m => m.PASSWORD_CHANGE_ROUTES)},
  {path: 'upgrade', loadComponent: () => import('./components/upgrade/upgrade.component').then(m => m.UpgradeComponent), canActivate: [AuthGuard], title: 'Upgrade | Rocketadmin'},
  {path: 'upgrade/payment', loadComponent: () => import('./components/payment-form/payment-form.component').then(m => m.PaymentFormComponent), canActivate: [AuthGuard], title: 'Payment | Rocketadmin'},
  {path: 'subscription/success', loadComponent: () => import('./components/upgrade-success/upgrade-success.component').then(m => m.UpgradeSuccessComponent), canActivate: [AuthGuard], title: 'Upgraded successfully | Rocketadmin'},
  {path: 'edit-db/:connection-id', loadComponent: () => import('./components/connect-db/connect-db.component').then(m => m.ConnectDBComponent), canActivate: [AuthGuard]},
  {path: 'connection-settings/:connection-id', loadComponent: () => import('./components/connection-settings/connection-settings.component').then(m => m.ConnectionSettingsComponent), canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [AuthGuard]},
  {path: 'audit/:connection-id', loadComponent: () => import('./components/audit/audit.component').then(m => m.AuditComponent), canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name', pathMatch: 'full', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/entry', pathMatch: 'full', loadComponent: () => import('./components/db-table-row-edit/db-table-row-edit.component').then(m => m.DbTableRowEditComponent), canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/widgets', pathMatch: 'full', loadComponent: () => import('./components/dashboard/db-table-view/db-table-widgets/db-table-widgets.component').then(m => m.DbTableWidgetsComponent), canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/settings', pathMatch: 'full', loadComponent: () => import('./components/dashboard/db-table-view/db-table-settings/db-table-settings.component').then(m => m.DbTableSettingsComponent), canActivate: [AuthGuard]},
  {path: 'dashboard/:connection-id/:table-name/actions', pathMatch: 'full', loadComponent: () => import('./components/dashboard/db-table-view/db-table-actions/db-table-actions.component').then(m => m.DbTableActionsComponent), canActivate: [AuthGuard]},
  {path: 'permissions/:connection-id', loadComponent: () => import('./components/users/users.component').then(m => m.UsersComponent), canActivate: [AuthGuard]},
  {path: 'zapier', loadComponent: () => import('./components/zapier/zapier.component').then(m => m.ZapierComponent), canActivate: [AuthGuard]},
  {path: '**', loadComponent: () => import('./components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent)},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
