import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemoConnectionsComponent } from './demo-connections.component';

describe('DemoConnectionsComponent', () => {
  let component: DemoConnectionsComponent;
  let fixture: ComponentFixture<DemoConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoConnectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemoConnectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
