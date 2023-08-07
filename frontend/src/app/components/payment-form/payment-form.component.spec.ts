import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxStripeModule } from 'ngx-stripe';
import { PaymentFormComponent } from './payment-form.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('PaymentFormComponent', () => {
  let component: PaymentFormComponent;
  let fixture: ComponentFixture<PaymentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        MatSnackBarModule,
        NgxStripeModule.forRoot('asdf')
      ],
      providers: [
        { provide: ActivatedRoute, useValue: {
          snapshot: {
            queryParams: {
              'plan': 'team',
              'period': 'monthly'
            }
          },
        }},
      ],
      declarations: [ PaymentFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
