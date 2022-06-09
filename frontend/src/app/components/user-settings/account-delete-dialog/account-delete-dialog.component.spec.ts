import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AccountDeleteConfirmationComponent } from '../account-delete-confirmation/account-delete-confirmation.component';
import { AccountDeleteDialogComponent } from './account-delete-dialog.component';
import { FormsModule }   from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('AccountDeleteDialogComponent', () => {
  let component: AccountDeleteDialogComponent;
  let fixture: ComponentFixture<AccountDeleteDialogComponent>;
  let dialog: MatDialog;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        MatSnackBarModule,
        FormsModule,
        MatRadioModule,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ],
      declarations: [ AccountDeleteDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountDeleteDialogComponent);
    dialog = TestBed.get(MatDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call delete user service', () => {
    component.reason = 'technical-issues';
    component.message = 'I cannot add connection';

    const fakeDeleteUserDialogOpen = spyOn(dialog, 'open');
    component.openDeleteConfirmation();

    expect(fakeDeleteUserDialogOpen).toHaveBeenCalledOnceWith(AccountDeleteConfirmationComponent, {
      width: '20em',
      data: {
        reason: 'technical-issues',
        message: 'I cannot add connection'
      }
    });
  });
});
