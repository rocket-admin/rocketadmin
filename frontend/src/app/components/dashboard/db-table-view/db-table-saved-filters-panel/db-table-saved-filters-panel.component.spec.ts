import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableSavedFiltersPanelComponent } from './db-table-saved-filters-panel.component';

describe('DbTableSavedFiltersPanelComponent', () => {
  let component: DbTableSavedFiltersPanelComponent;
  let fixture: ComponentFixture<DbTableSavedFiltersPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DbTableSavedFiltersPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DbTableSavedFiltersPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
