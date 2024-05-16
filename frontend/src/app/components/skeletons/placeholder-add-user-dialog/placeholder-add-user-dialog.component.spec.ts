import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderAddUserDialogComponent } from './placeholder-add-user-dialog.component';

describe('PlaceholderAddUserDialogComponent', () => {
  let component: PlaceholderAddUserDialogComponent;
  let fixture: ComponentFixture<PlaceholderAddUserDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlaceholderAddUserDialogComponent]
    });
    fixture = TestBed.createComponent(PlaceholderAddUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
