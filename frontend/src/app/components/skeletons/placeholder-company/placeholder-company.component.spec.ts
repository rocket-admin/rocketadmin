import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderCompanyComponent } from './placeholder-company.component';

describe('PlaceholderCompanyComponent', () => {
  let component: PlaceholderCompanyComponent;
  let fixture: ComponentFixture<PlaceholderCompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaceholderCompanyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceholderCompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
