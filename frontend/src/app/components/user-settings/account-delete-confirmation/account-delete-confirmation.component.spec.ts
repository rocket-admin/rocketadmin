import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AccountDeleteConfirmationComponent } from './account-delete-confirmation.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('AccountDeleteConfirmationComponent', () => {
  let component: AccountDeleteConfirmationComponent;
  let fixture: ComponentFixture<AccountDeleteConfirmationComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      MatDialogModule,
      MatSnackBarModule,
      Angulartics2Module.forRoot(),
      AccountDeleteConfirmationComponent
    ],
    providers: [
      provideHttpClient(),
      provideRouter([]),
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
