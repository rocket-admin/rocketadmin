import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteMemberDialogComponent } from './invite-member-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Angulartics2Module } from 'angulartics2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('AddMemberDialogComponent', () => {
  let component: InviteMemberDialogComponent;
  let fixture: ComponentFixture<InviteMemberDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        FormsModule,
        Angulartics2Module.forRoot(),
        InviteMemberDialogComponent
    ],
    providers: [
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
