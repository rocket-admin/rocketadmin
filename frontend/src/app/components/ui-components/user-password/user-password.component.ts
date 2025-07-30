import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PasswordStrengthMeterComponent } from '@eresearchqut/angular-password-strength-meter';
import { PasswordValidationDirective } from 'src/app/directives/passwordValidator.directive';
import { Angulartics2OnModule } from 'angulartics2';

@Component({
  selector: 'app-user-password',
  templateUrl: './user-password.component.html',
  styleUrls: ['./user-password.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    PasswordValidationDirective,
    PasswordStrengthMeterComponent,
    Angulartics2OnModule
  ]
})
export class UserPasswordComponent implements OnInit {

  @Input() value: string;
  @Input() label: string;
  @Output() onFieldChange = new EventEmitter();

  public passwordHidden: boolean;

  constructor() { }

  ngOnInit(): void {
  }

}
