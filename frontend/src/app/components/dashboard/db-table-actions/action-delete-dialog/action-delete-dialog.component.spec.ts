import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionDeleteDialogComponent } from './action-delete-dialog.component';

describe('ActionDeleteDialogComponent', () => {
  let component: ActionDeleteDialogComponent;
  let fixture: ComponentFixture<ActionDeleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActionDeleteDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
