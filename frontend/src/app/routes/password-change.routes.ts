import { Routes } from '@angular/router';
import { provideZxvbnServiceForPSM } from 'angular-password-strength-meter/zxcvbn';
import { AuthGuard } from '../auth.guard';

export const PASSWORD_CHANGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../components/password-change/password-change.component').then(m => m.PasswordChangeComponent),
    canActivate: [AuthGuard],
    providers: [provideZxvbnServiceForPSM()]
  }
];
