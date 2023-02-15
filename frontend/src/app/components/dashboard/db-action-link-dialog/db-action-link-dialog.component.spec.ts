import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbActionLinkDialogComponent } from './db-action-link-dialog.component';

describe('DbActionLinkDialogComponent', () => {
  let component: DbActionLinkDialogComponent;
  let fixture: ComponentFixture<DbActionLinkDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbActionLinkDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbActionLinkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
