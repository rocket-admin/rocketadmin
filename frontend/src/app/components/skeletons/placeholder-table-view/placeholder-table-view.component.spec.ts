import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderTableViewComponent } from './placeholder-table-view.component';

describe('PlaceholderTableViewComponent', () => {
  let component: PlaceholderTableViewComponent;
  let fixture: ComponentFixture<PlaceholderTableViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PlaceholderTableViewComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderTableViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
