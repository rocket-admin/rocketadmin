import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderCompanyInvitationComponent } from './placeholder-company-invitation.component';

describe('PlaceholderCompanyInvitationComponent', () => {
  let component: PlaceholderCompanyInvitationComponent;
  let fixture: ComponentFixture<PlaceholderCompanyInvitationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderCompanyInvitationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderCompanyInvitationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
