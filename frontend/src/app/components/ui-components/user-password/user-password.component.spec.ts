import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { UserPasswordComponent } from './user-password.component';
import { IPasswordStrengthMeterService } from '@eresearchqut/angular-password-strength-meter';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';

describe('UserPasswordComponent', () => {
  let component: UserPasswordComponent;
  let fixture: ComponentFixture<UserPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, BrowserAnimationsModule, Angulartics2Module.forRoot({}), UserPasswordComponent],
      providers: [{ provide: IPasswordStrengthMeterService, useValue: {} }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
