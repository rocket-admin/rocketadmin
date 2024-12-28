import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AccountDeleteConfirmationComponent } from './account-delete-confirmation.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';

describe('AccountDeleteConfirmationComponent', () => {
  let component: AccountDeleteConfirmationComponent;
  let fixture: ComponentFixture<AccountDeleteConfirmationComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      RouterTestingModule.withRoutes([]),
      MatDialogModule,
      MatSnackBarModule,
      Angulartics2Module.forRoot(),
      AccountDeleteConfirmationComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: {} },
      { provide: MatDialogRef, useValue: mockDialogRef }
    ]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountDeleteConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
