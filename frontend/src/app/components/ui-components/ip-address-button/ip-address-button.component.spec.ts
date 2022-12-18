import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { IpAddressButtonComponent } from './ip-address-button.component';

describe('IpAddressButtonComponent', () => {
  let component: IpAddressButtonComponent;
  let fixture: ComponentFixture<IpAddressButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpAddressButtonComponent ],
      imports: [ MatSnackBarModule ]
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
