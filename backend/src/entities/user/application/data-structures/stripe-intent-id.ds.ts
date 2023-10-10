import { ApiProperty } from '@nestjs/swagger';

export class StripeIntentDs {
  @ApiProperty()
  stripeIntentId: string;

  @ApiProperty()
  stripeIntentSecret: string;
}
