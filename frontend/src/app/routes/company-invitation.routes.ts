import { Routes } from '@angular/router';
import { provideZxvbnServiceForPSM } from 'angular-password-strength-meter/zxcvbn';

export const COMPANY_INVITATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../components/company-member-invitation/company-member-invitation.component').then(m => m.CompanyMemberInvitationComponent),
    title: 'Invitation | Rocketadmin',
    providers: [provideZxvbnServiceForPSM()]
  }
];
