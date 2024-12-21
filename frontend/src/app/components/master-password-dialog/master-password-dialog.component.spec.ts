import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';

import { MasterPasswordDialogComponent } from './master-password-dialog.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('MasterPasswordDialogComponent', () => {
  let component: MasterPasswordDialogComponent;
  let fixture: ComponentFixture<MasterPasswordDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        MatSnackBarModule,
        MatDialogModule,
        FormsModule,
        MasterPasswordDialogComponent,
        BrowserAnimationsModule
    ],
    providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
    ],
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MasterPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
