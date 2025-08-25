import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderSavedFiltersComponent } from './placeholder-saved-filters.component';

describe('PlaceholderSavedFiltersComponent', () => {
  let component: PlaceholderSavedFiltersComponent;
  let fixture: ComponentFixture<PlaceholderSavedFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PlaceholderSavedFiltersComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderSavedFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
