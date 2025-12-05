import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';

import { MasterPasswordDialogComponent } from './master-password-dialog.component';

describe('MasterPasswordDialogComponent', () => {
  let component: MasterPasswordDialogComponent;
  let fixture: ComponentFixture<MasterPasswordDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<MasterPasswordDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        MasterPasswordDialogComponent,
        BrowserAnimationsModule,
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MasterPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeTrue();
  });

  it('should show error when submitting empty password', () => {
    component.onSubmit();
    expect(component.error).toBe('Please enter the master password');
  });

  it('should close dialog with password when submitting valid password', () => {
    component.masterPassword = 'testpassword';
    component.onSubmit();
    expect(mockDialogRef.close).toHaveBeenCalledWith('testpassword');
  });
});
