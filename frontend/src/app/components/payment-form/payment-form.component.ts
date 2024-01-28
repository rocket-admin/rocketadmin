import { ActivatedRoute, Router } from '@angular/router';
import { AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  PaymentIntent,
  StripeCardElementOptions,
  StripeElementsOptions
} from '@stripe/stripe-js';
import { StripePaymentElementComponent, StripeService } from 'ngx-stripe';
import { SubscriptionPlans, User } from 'src/app/models/user';
import { addMonths, format } from 'date-fns'

import { HttpClient } from '@angular/common/http';
import { NotificationsService } from 'src/app/services/notifications.service';
import { PaymentService } from 'src/app/services/payment.service';
import { UserService } from 'src/app/services/user.service';
import plans from '../../consts/plans';

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
        fontFamily: 'Noto Sans, sans-serif',
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
    private _notifications: NotificationsService,
    private http: HttpClient,
    private fb: FormBuilder,
    private stripeService: StripeService,
    private route: ActivatedRoute,
    public router: Router,
  ) { }

  public paymentElementForm = null;
  public plan: 'team' | 'enterprise' | 'free';
  public price: number;
  public isAnnually: boolean;
  public subscriptionLevel: string;
  public nextPaymentDate: string;
  public companyId: string;

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParams;
    this.plan = queryParams.plan;
    this.isAnnually = queryParams.period === 'annually';
    const chosenPlan = plans.find(plan => plan.key === this.plan);
    this.price = chosenPlan.price;
    this.subscriptionLevel = `${ this.isAnnually ? 'ANNUAL_' : '' }${this.plan.toUpperCase()}_PLAN`;
    this.nextPaymentDate = format(addMonths(new Date(), 1), 'P');

    this._userService.cast.subscribe(user => {
      if (user) this._paymentService.createIntentToSubscription(user.company.id).subscribe(res => {
        this.companyId = user.company.id;
        this.paymentElementForm = this.fb.group({
          name: [user.name, [Validators.required]],
          email: [user.email, [Validators.required]],
          address: [''],
          zipcode: [''],
          city: ['']
        });
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
          this._notifications.showAlert(AlertType.Error, result.error.message, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
        } else {
          // The payment has been processed!
          if (result.setupIntent.status === 'succeeded') {
            this._paymentService.createSubscription(this.companyId, result.setupIntent.payment_method, this.subscriptionLevel)
              .subscribe(res => {
                this._notifications.showSuccessSnackbar('Payment successful');
                this.router.navigate(['/upgrade']);
              })
          } else {
            this._notifications.showAlert(AlertType.Error, result.error.message, [
              {
                type: AlertActionType.Button,
                caption: 'Dismiss',
                action: (id: number) => this._notifications.dismissAlert()
              }
            ]);
          }
        }
      });
    } else {
      console.log(this.paymentElementForm);
    }
  }
}
