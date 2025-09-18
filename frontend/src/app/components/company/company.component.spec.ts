import { Company, CompanyMember, CompanyMemberRole } from 'src/app/models/company';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Angulartics2Module } from 'angulartics2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CompanyComponent } from './company.component';
import { CompanyService } from 'src/app/services/company.service';
import { DeleteMemberDialogComponent } from './delete-member-dialog/delete-member-dialog.component';
import { FormsModule } from '@angular/forms';
import { InviteMemberDialogComponent } from './invite-member-dialog/invite-member-dialog.component';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RevokeInvitationDialogComponent } from './revoke-invitation-dialog/revoke-invitation-dialog.component';
import { SubscriptionPlans } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('CompanyComponent', () => {
  let component: CompanyComponent;
  let fixture: ComponentFixture<CompanyComponent>;
  let dialog: MatDialog;

  let fakeCompanyService = jasmine.createSpyObj('CompanyService', ['isCustomDomain', 'fetchCompany', 'fetchCompanyMembers', 'getCustomDomain', 'updateCompanyName', 'updateCompanyMemberRole', 'cast']);
  let fakeUserService = jasmine.createSpyObj('UserService', ['cast']);

  const mockCompany: Company = {
    "id": "company-12345678",
    "name": "My company",
    "additional_info": null,
    "portal_link": "https://payments.rocketadmin.com/p/session/123455",
    "subscriptionLevel": SubscriptionPlans.free,
    "is_payment_method_added": true,
    "address": {},
    "connections": [
      {
        "id": "12345678",
        "createdAt": "2024-02-12T16:54:56.482Z",
        "updatedAt": "2024-02-12T17:08:12.643Z",
        "title": "Test DB",
        "author": {
          "id": "author-1",
          "isActive": false,
          "email": "author1@test.com",
          "createdAt": "2024-01-06T21:11:36.746Z",
          "name": "John Smith",
          "is_2fa_enabled": false,
          "role": "ADMIN"
        },
        "groups": [
          {
            "id": "0955923f-9101-4fa9-95ca-b003a5c7ce89",
            "isMain": true,
            "title": "Admin",
            "users": [
              {
                "id": "a06ee7bf-e6c9-4c1a-a5aa-e9ba09e3e8a1",
                "isActive": false,
                "email": "author1@test.com",
                "createdAt": "2024-01-06T21:11:36.746Z",
                "name": null,
                "is_2fa_enabled": false,
                "role": CompanyMemberRole.CAO
              }
            ]
          },
        ]
      },
    ],
    "invitations": [
      {
        "id": "invitation1",
        "verification_string": "verification_string_12345678",
        "groupId": null,
        "inviterId": "user1",
        "invitedUserEmail": "admin1@test.com",
        "role": CompanyMemberRole.CAO,
      }
    ],
    show_test_connections: false
  }

  const mockMembers = [
    {
      "id": "61582cb5-5577-43d2-811f-900668ecfff1",
      "isActive": true,
      "email": "user1@test.com",
      "createdAt": "2024-02-05T09:41:08.199Z",
      "name": "User 3333",
      "is_2fa_enabled": false,
      "role": "USER"
    },
    {
      "id": "a06ee7bf-e6c9-4c1a-a5aa-e9ba09e3e8a1",
      "isActive": false,
      "email": "admin0@test.com",
      "createdAt": "2024-01-06T21:11:36.746Z",
      "name": null,
      "is_2fa_enabled": false,
      "role": "ADMIN"
    }
  ]

  const mockCompanyDomain = {
    "success": false,
    "domain_info": null
  }

  fakeCompanyService.cast = of('');
  fakeCompanyService.fetchCompany.and.returnValue(of(mockCompany));
  fakeCompanyService.fetchCompanyMembers.and.returnValue(of(mockMembers));
  fakeCompanyService.getCustomDomain.and.returnValue(of(mockCompanyDomain));
  fakeCompanyService.updateCompanyName.and.returnValue(of({}));
  fakeCompanyService.updateCompanyMemberRole.and.returnValue(of({}));
  fakeCompanyService.getCurrentTabTitle = jasmine.createSpy().and.returnValue(of('Rocketadmin'));
  fakeUserService.cast = of(mockMembers[1]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        MatSnackBarModule,
        MatDialogModule,
        Angulartics2Module.forRoot(),
        FormsModule,
        MatInputModule,
        BrowserAnimationsModule,
        CompanyComponent
    ],
    providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: CompanyService, useValue: fakeCompanyService },
        { provide: UserService, useValue: fakeUserService }
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(CompanyComponent);
    component = fixture.componentInstance;
    dialog = TestBed.get(MatDialog);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set initial values and call functions to define plan and receive company members', () => {
    const fakeSetCompanyPlan = spyOn(component, 'setCompanyPlan');
    spyOn(fakeCompanyService.cast, 'subscribe');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.company).toEqual(mockCompany);
    expect(fakeSetCompanyPlan).toHaveBeenCalledWith(mockCompany.subscriptionLevel);
    expect(fakeCompanyService.fetchCompanyMembers).toHaveBeenCalledWith(mockCompany.id);
    expect(fakeCompanyService.cast.subscribe).toHaveBeenCalled();
  });

  it('should receive company info and members when invitation was sent', () => {
    fakeCompanyService.cast = of('invited');

    component.ngOnInit();
    fixture.detectChanges();

    expect(fakeCompanyService.fetchCompany).toHaveBeenCalledWith();
    expect(fakeCompanyService.fetchCompanyMembers).toHaveBeenCalledWith(mockCompany.id);
  });

  it('should receive company members when a member was deleted', () => {
    fakeCompanyService.cast = of('deleted');

    component.ngOnInit();
    fixture.detectChanges();

    expect(fakeCompanyService.fetchCompanyMembers).toHaveBeenCalledWith(mockCompany.id);
  });

  it('should get company members and mix it with invitation, and set the value', () => {
    fakeCompanyService.cast = of('deleted');

    component.getCompanyMembers('company-12345678');

    expect(component.members).toEqual([
      {
        "id": "a06ee7bf-e6c9-4c1a-a5aa-e9ba09e3e8a1",
        "isActive": false,
        "email": "admin0@test.com",
        "createdAt": "2024-01-06T21:11:36.746Z",
        "name": null,
        "is_2fa_enabled": false,
        "role": "ADMIN"
      },
      {
        "id": "61582cb5-5577-43d2-811f-900668ecfff1",
        "isActive": true,
        "email": "user1@test.com",
        "createdAt": "2024-02-05T09:41:08.199Z",
        "name": "User 3333",
        "is_2fa_enabled": false,
        "role": "USER"
      },
      {
        "id": "invitation1",
        "verification_string": "verification_string_12345678",
        "groupId": null,
        "inviterId": "user1",
        "invitedUserEmail": "admin1@test.com",
        "role": CompanyMemberRole.CAO,
        "pending": true,
        email: "admin1@test.com"
      }
    ]);
    expect(component.adminsCount).toBe(1);
    expect(component.usersCount).toBe(3);
  });

  it('should set company plan to team if TEAM_PLAN', () => {
    component.setCompanyPlan(SubscriptionPlans.team);

    expect(component.currentPlan).toBe('team');
  });

  it('should set company plan to free if nothing is in subscriptionLevel', () => {
    component.setCompanyPlan(null);

    expect(component.currentPlan).toBe('free');
  });

  it('should open Add member dialog and pass company id and name', () => {
    const fakeAddMemberDialogOpen = spyOn(dialog, 'open');
    component.company = mockCompany;

    component.handleAddMemberDialogOpen();
    expect(fakeAddMemberDialogOpen).toHaveBeenCalledOnceWith(InviteMemberDialogComponent, {
      width: '25em',
      data: mockCompany
    });
  });

  it('should open Delete member dialog and pass company id and member', () => {
    const fakeDeleteMemberDialogOpen = spyOn(dialog, 'open');
    component.company.id = 'company-12345678';
    const fakeMember: CompanyMember = {
      "id": "61582cb5-5577-43d2-811f-900668ecfff1",
      "isActive": true,
      "email": "user1@test.com",
      "name": "User 3333",
      "is_2fa_enabled": false,
      "role": CompanyMemberRole.Member,
      "has_groups": false
    }

    component.handleDeleteMemberDialogOpen(fakeMember);
    expect(fakeDeleteMemberDialogOpen).toHaveBeenCalledOnceWith(DeleteMemberDialogComponent, {
      width: '25em',
      data: {companyId: 'company-12345678', user: fakeMember}
    });
  });

  it('should open Revoke invitation dialog and pass company id and member email', () => {
    const fakeRevokeInvitationDialogOpen = spyOn(dialog, 'open');
    component.company.id = 'company-12345678';

    component.handleRevokeInvitationDialogOpen('user1@test.com');
    expect(fakeRevokeInvitationDialogOpen).toHaveBeenCalledOnceWith(RevokeInvitationDialogComponent, {
      width: '25em',
      data: {companyId: 'company-12345678', userEmail: 'user1@test.com'}
    });
  });

  it('should call update company name', () => {
    component.company.id = 'company-12345678';
    component.company.name = 'New company name';

    component.changeCompanyName();
    expect(fakeCompanyService.updateCompanyName).toHaveBeenCalledOnceWith('company-12345678', 'New company name');
  });

  it('should call update company member role to ADMIN and request company members list', () => {
    component.company.id = 'company-12345678';
    component.company.name = 'New company name';

    component.updateRole('user-12345678', CompanyMemberRole.CAO);
    expect(fakeCompanyService.updateCompanyMemberRole).toHaveBeenCalledOnceWith('company-12345678', 'user-12345678', 'ADMIN');
    expect(fakeCompanyService.fetchCompanyMembers).toHaveBeenCalledWith('company-12345678');
  });
});
