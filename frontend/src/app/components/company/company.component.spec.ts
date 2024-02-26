import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Angulartics2Module } from 'angulartics2';
import { CompanyComponent } from './company.component';
import { CompanyService } from 'src/app/services/company.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('CompanyComponent', () => {
  let component: CompanyComponent;
  let fixture: ComponentFixture<CompanyComponent>;

  let fakeCompanyService = jasmine.createSpyObj('CompanyService', ['fetchCompany', 'fetchCompanyMembers']);

  const mockCompany = {
    "id": "company-12345678",
    "name": "My company",
    "additional_info": null,
    "portal_link": "https://payments.rocketadmin.com/p/session/123455",
    "subscriptionLevel": "FREE_PLAN",
    "is_payment_method_added": true,
    "address": {},
    "createdAt": "2024-01-06T21:11:36.569Z",
    "updatedAt": "2024-01-07T15:28:41.776Z",
    "connections": [
      {
        "id": "12345678",
        "createdAt": "2024-02-12T16:54:56.482Z",
        "updatedAt": "2024-02-12T17:08:12.643Z",
        "title": "Test DB",
        "author": {
          "id": "author-1",
          "isActive": false,
          "email": "author1@voloshko.com",
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
                "email": "author1@voloshko.com",
                "createdAt": "2024-01-06T21:11:36.746Z",
                "name": null,
                "is_2fa_enabled": false,
                "role": "ADMIN"
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
        "invitedUserEmail": "lyubov@voloshko.com",
        "role": "ADMIN",
        "createdAt": "2024-01-19T15:30:41.693Z"
      }
    ]
  }

  const mockUsers = [
    {
      "id": "61582cb5-5577-43d2-811f-900668ecfff1",
      "isActive": true,
      "email": "lyubov+3333@voloshko.com",
      "createdAt": "2024-02-05T09:41:08.199Z",
      "name": "Lyubov 3333",
      "is_2fa_enabled": false,
      "role": "USER"
    },
    {
      "id": "a06ee7bf-e6c9-4c1a-a5aa-e9ba09e3e8a1",
      "isActive": false,
      "email": "lyubov@voloshko.com",
      "createdAt": "2024-01-06T21:11:36.746Z",
      "name": null,
      "is_2fa_enabled": false,
      "role": "ADMIN"
    }
  ]

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyComponent ],
      imports: [
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
        Angulartics2Module.forRoot()
      ],
      providers: [
        { provide: CompanyService, useValue: fakeCompanyService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set initial values', () => {

  });
});
