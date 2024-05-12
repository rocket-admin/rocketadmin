import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupNameEditDialogComponent } from './group-name-edit-dialog.component';

describe('GroupNameEditDialogComponent', () => {
  let component: GroupNameEditDialogComponent;
  let fixture: ComponentFixture<GroupNameEditDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GroupNameEditDialogComponent]
    });
    fixture = TestBed.createComponent(GroupNameEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
