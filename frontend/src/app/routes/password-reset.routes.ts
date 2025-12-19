import { Routes } from '@angular/router';
import { provideZxvbnServiceForPSM } from 'angular-password-strength-meter/zxcvbn';

export const PASSWORD_RESET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../components/password-reset/password-reset.component').then(m => m.PasswordResetComponent),
    title: 'Reset password | Rocketadmin',
    providers: [provideZxvbnServiceForPSM()]
  }
];
