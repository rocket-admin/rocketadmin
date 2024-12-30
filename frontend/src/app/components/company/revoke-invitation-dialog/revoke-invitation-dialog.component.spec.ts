import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevokeInvitationDialogComponent } from './revoke-invitation-dialog.component';
import { Angulartics2Module } from 'angulartics2';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';

describe('RevokeInvitationDialogComponent', () => {
  let component: RevokeInvitationDialogComponent;
  let fixture: ComponentFixture<RevokeInvitationDialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      MatSnackBarModule,
      Angulartics2Module.forRoot(),
      RevokeInvitationDialogComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: { companyId: '', userEmail: '' } },
      { provide: MatDialogRef, useValue: MatDialogRef }
    ],
})
    .compileComponents();

    fixture = TestBed.createComponent(RevokeInvitationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
