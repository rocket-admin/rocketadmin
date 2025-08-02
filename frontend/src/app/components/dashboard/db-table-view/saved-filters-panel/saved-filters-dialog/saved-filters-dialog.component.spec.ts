import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedFiltersDialogComponent } from './saved-filters-dialog.component';

describe('SavedFiltersDialogComponent', () => {
  let component: SavedFiltersDialogComponent;
  let fixture: ComponentFixture<SavedFiltersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedFiltersDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedFiltersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
