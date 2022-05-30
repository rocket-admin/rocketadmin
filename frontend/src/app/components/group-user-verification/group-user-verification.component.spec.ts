import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupUserVerificationComponent } from './group-user-verification.component';

describe('GroupUserVerificationComponent', () => {
  let component: GroupUserVerificationComponent;
  let fixture: ComponentFixture<GroupUserVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupUserVerificationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupUserVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
