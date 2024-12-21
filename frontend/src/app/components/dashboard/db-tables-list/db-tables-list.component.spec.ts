import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTablesListComponent } from './db-tables-list.component';

describe('DbTablesListComponent', () => {
  let component: DbTablesListComponent;
  let fixture: ComponentFixture<DbTablesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DbTablesListComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DbTablesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
