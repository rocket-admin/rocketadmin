import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { InviteMemberDialogComponent } from './invite-member-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient } from '@angular/common/http';

describe('AddMemberDialogComponent', () => {
  let component: InviteMemberDialogComponent;
  let fixture: ComponentFixture<InviteMemberDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      MatSnackBarModule,
      FormsModule,
      Angulartics2Module.forRoot(),
      InviteMemberDialogComponent,
      BrowserAnimationsModule
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: { id: '', connections: [] } },
      { provide: MatDialogRef, useValue: MatDialogRef }
    ],
})
    .compileComponents();

    fixture = TestBed.createComponent(InviteMemberDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
