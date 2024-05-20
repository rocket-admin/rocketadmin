import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { FormsModule } from '@angular/forms';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('GroupNameEditDialogComponent', () => {
  let component: GroupNameEditDialogComponent;
  let fixture: ComponentFixture<GroupNameEditDialogComponent>;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GroupNameEditDialogComponent],
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        FormsModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    });
    fixture = TestBed.createComponent(GroupNameEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
