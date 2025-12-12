import { Routes } from '@angular/router';
import { provideZxvbnServiceForPSM } from 'angular-password-strength-meter/zxcvbn';

export const REGISTRATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../components/registration/registration.component').then(m => m.RegistrationComponent),
    title: 'Sign up | Rocketadmin',
    providers: [provideZxvbnServiceForPSM()]
  }
];
