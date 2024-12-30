import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderTableSettingsComponent } from './placeholder-table-settings.component';

describe('PlaceholderTableSettingsComponent', () => {
  let component: PlaceholderTableSettingsComponent;
  let fixture: ComponentFixture<PlaceholderTableSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PlaceholderTableSettingsComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderTableSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
