import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AccountDeleteConfirmationComponent } from './account-delete-confirmation.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from "@angular/router/testing";
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Angulartics2Module } from 'angulartics2';

describe('AccountDeleteConfirmationComponent', () => {
  let component: AccountDeleteConfirmationComponent;
  let fixture: ComponentFixture<AccountDeleteConfirmationComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatDialogModule,
        MatSnackBarModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ],
      declarations: [ AccountDeleteConfirmationComponent ]
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
