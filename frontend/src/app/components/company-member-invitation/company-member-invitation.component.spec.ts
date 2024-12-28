import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyMemberInvitationComponent } from './company-member-invitation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { Angulartics2Module } from 'angulartics2';
import { IPasswordStrengthMeterService } from 'angular-password-strength-meter';

describe('CompanyMemberInvitationComponent', () => {
  let component: CompanyMemberInvitationComponent;
  let fixture: ComponentFixture<CompanyMemberInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      HttpClientTestingModule,
      RouterTestingModule.withRoutes([]),
      MatSnackBarModule,
      Angulartics2Module.forRoot(),
      CompanyMemberInvitationComponent
    ],
    providers: [{ provide: IPasswordStrengthMeterService, useValue: {} }]
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
