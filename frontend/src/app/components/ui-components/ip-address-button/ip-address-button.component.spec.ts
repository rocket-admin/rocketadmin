import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpAddressButtonComponent } from './ip-address-button.component';

describe('IpAddressButtonComponent', () => {
  let component: IpAddressButtonComponent;
  let fixture: ComponentFixture<IpAddressButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpAddressButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpAddressButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
