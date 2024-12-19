import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DbTableRowViewComponent } from './db-table-row-view.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('DbTableRowViewComponent', () => {
  let component: DbTableRowViewComponent;
  let fixture: ComponentFixture<DbTableRowViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [
        MatSnackBarModule,
        DbTableRowViewComponent
    ],
});
    fixture = TestBed.createComponent(DbTableRowViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
