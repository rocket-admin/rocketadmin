import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnConnectionsComponent } from './own-connections.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('OwnConnectionsComponent', () => {
  let component: OwnConnectionsComponent;
  let fixture: ComponentFixture<OwnConnectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnConnectionsComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
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
