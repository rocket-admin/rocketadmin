import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteMemberDialogComponent } from './delete-member-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Angulartics2Module } from 'angulartics2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('DeleteMemberDialogComponent', () => {
  let component: DeleteMemberDialogComponent;
  let fixture: ComponentFixture<DeleteMemberDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeleteMemberDialogComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        FormsModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
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
