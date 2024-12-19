import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderUserGroupComponent } from './placeholder-user-group.component';

describe('PlaceholderUserGroupComponent', () => {
  let component: PlaceholderUserGroupComponent;
  let fixture: ComponentFixture<PlaceholderUserGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PlaceholderUserGroupComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderUserGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
