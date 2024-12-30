import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderConnectionSettingsComponent } from './placeholder-connection-settings.component';

describe('PlaceholderConnectionSettingsComponent', () => {
  let component: PlaceholderConnectionSettingsComponent;
  let fixture: ComponentFixture<PlaceholderConnectionSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PlaceholderConnectionSettingsComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderConnectionSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
