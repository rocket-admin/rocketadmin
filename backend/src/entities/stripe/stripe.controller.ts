import { Controller, Inject, Injectable, Post, Req, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { StripeWebhookDS } from './application/data-structures/stripe-webhook.ds.js';
import { IStripeWebhook } from './use-cases/stripe-use-cases.interface.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('stripe')
@Injectable()
export class StripeWebhookController {
  constructor(
    @Inject(UseCaseType.STRIPE_WEBHOOK)
    private readonly stripeWebhookUseCase: IStripeWebhook,
  ) {}

  @Post('/webhook')
  async processStripeWebhook(@Req() request: Request): Promise<void> {
    const sig = request.headers['stripe-signature'] as string;
    const inputData: StripeWebhookDS = {
      request: request,
      stripeSigranture: sig,
    };
    return await this.stripeWebhookUseCase.execute(inputData);
  }
}
