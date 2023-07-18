import { Component, OnInit, ViewChild } from '@angular/core';
import { PaymentService } from 'src/app/services/payment.service';
import { UserService } from 'src/app/services/user.service';
import { StripeService, StripePaymentElementComponent } from 'ngx-stripe';
import {
  StripeElementsOptions,
  PaymentIntent,
  StripeCardElementOptions
} from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-payment-form',
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css']
})
export class PaymentFormComponent implements OnInit {

  @ViewChild(StripePaymentElementComponent)
  paymentElement: StripePaymentElementComponent;

  elementsOptions: StripeElementsOptions = {
    locale: 'en',
  };

  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        fontWeight: '300',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '18px',
        '::placeholder': {
          color: '#CFD7E0',
        },
      },
    },
  };

  // public paymentElementForm;
  public paying = false;

  constructor(
    private _paymentService: PaymentService,
    private _userService: UserService,
    private http: HttpClient,
    private fb: FormBuilder,
    private stripeService: StripeService
  ) { }

  public paymentElementForm;

  ngOnInit(): void {
    this.paymentElementForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required]],
      address: [''],
      zipcode: [''],
      city: ['']
    });

    this._userService.cast.subscribe(user => {
      if (user) this._paymentService.intentToPay().subscribe(res => {
        console.log(res);
        this.elementsOptions.clientSecret = res.stripeIntentSecret;
      });
    });
  }

  pay() {
    if (this.paymentElementForm.valid) {
      this.paying = true;
      this.stripeService.confirmSetup({
        elements: this.paymentElement.elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: this.paymentElementForm.get('name').value,
              email: this.paymentElementForm.get('email').value,
              address: {
                line1: this.paymentElementForm.get('address').value || '',
                postal_code: this.paymentElementForm.get('zipcode').value || '',
                city: this.paymentElementForm.get('city').value || '',
              }
            }
          }
        },
        redirect: 'if_required'
      }).subscribe(result => {
        this.paying = false;
        console.log('Result', result);
        if (result.error) {
          // Show error to your customer (e.g., insufficient funds)
          console.log({ success: false, error: result.error.message });
        } else {
          // The payment has been processed!
          if (result.setupIntent.status === 'succeeded') {
            // Show a success message to your customer
            console.log({ success: true });
            console.log(result.setupIntent.client_secret);
          }
        }
      });
    } else {
      console.log(this.paymentElementForm);
    }
  }
}
