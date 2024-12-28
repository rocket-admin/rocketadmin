import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyMemberInvitationComponent } from './company-member-invitation.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { Angulartics2Module } from 'angulartics2';
import { IPasswordStrengthMeterService } from 'angular-password-strength-meter';
import { provideHttpClient } from '@angular/common/http';

describe('CompanyMemberInvitationComponent', () => {
  let component: CompanyMemberInvitationComponent;
  let fixture: ComponentFixture<CompanyMemberInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      RouterTestingModule.withRoutes([]),
      MatSnackBarModule,
      Angulartics2Module.forRoot(),
      CompanyMemberInvitationComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: IPasswordStrengthMeterService, useValue: {} }
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(CompanyMemberInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
