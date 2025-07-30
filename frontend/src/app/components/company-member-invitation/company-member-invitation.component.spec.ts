import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyMemberInvitationComponent } from './company-member-invitation.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { IPasswordStrengthMeterService } from '@eresearchqut/angular-password-strength-meter';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('CompanyMemberInvitationComponent', () => {
  let component: CompanyMemberInvitationComponent;
  let fixture: ComponentFixture<CompanyMemberInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        Angulartics2Module.forRoot(),
        CompanyMemberInvitationComponent
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: IPasswordStrengthMeterService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyMemberInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
