import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Angulartics2Module } from 'angulartics2';
import { DeleteMemberDialogComponent } from './delete-member-dialog.component';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient } from '@angular/common/http';

describe('DeleteMemberDialogComponent', () => {
  let component: DeleteMemberDialogComponent;
  let fixture: ComponentFixture<DeleteMemberDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      MatSnackBarModule,
      FormsModule,
      Angulartics2Module.forRoot(),
      DeleteMemberDialogComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: {
        companyId: '',
        user: {
            id: '',
            email: '',
            name: ''
        }
      }},
      { provide: MatDialogRef, useValue: MatDialogRef }
    ],
})
    .compileComponents();

    fixture = TestBed.createComponent(DeleteMemberDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
