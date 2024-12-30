import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderUserGroupsComponent } from './placeholder-user-groups.component';

describe('PlaceholderUserGroupsComponent', () => {
  let component: PlaceholderUserGroupsComponent;
  let fixture: ComponentFixture<PlaceholderUserGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PlaceholderUserGroupsComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderUserGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
