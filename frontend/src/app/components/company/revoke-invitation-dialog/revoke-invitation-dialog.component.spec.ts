import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevokeInvitationDialogComponent } from './revoke-invitation-dialog.component';

describe('RevokeInvitationDialogComponent', () => {
  let component: RevokeInvitationDialogComponent;
  let fixture: ComponentFixture<RevokeInvitationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RevokeInvitationDialogComponent ]
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
