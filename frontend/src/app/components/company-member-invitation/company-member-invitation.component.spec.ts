import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyMemberInvitationComponent } from './company-member-invitation.component';

describe('CompanyMemberInvitationComponent', () => {
  let component: CompanyMemberInvitationComponent;
  let fixture: ComponentFixture<CompanyMemberInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyMemberInvitationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyMemberInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
