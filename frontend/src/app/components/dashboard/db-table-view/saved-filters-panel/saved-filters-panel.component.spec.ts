import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedFiltersPanelComponent } from './saved-filters-panel.component';

describe('SavedFiltersPanelComponent', () => {
  let component: SavedFiltersPanelComponent;
  let fixture: ComponentFixture<SavedFiltersPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedFiltersPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedFiltersPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
