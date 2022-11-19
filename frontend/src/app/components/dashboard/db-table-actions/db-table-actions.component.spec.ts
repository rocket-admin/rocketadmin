import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableActionsComponent } from './db-table-actions.component';

describe('DbTableActionsComponent', () => {
  let component: DbTableActionsComponent;
  let fixture: ComponentFixture<DbTableActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DbTableActionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbTableActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
