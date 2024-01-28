import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderConnectionsComponent } from './placeholder-connections.component';

describe('PlaceholderConnectionsComponent', () => {
  let component: PlaceholderConnectionsComponent;
  let fixture: ComponentFixture<PlaceholderConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderConnectionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderConnectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
