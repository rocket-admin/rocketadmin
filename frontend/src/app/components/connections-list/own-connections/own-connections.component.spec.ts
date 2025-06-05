import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnConnectionsComponent } from './own-connections.component';

describe('OwnConnectionsComponent', () => {
  let component: OwnConnectionsComponent;
  let fixture: ComponentFixture<OwnConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnConnectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OwnConnectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
