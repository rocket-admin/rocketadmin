import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStripeCustomerDS {
  userId: string;

  @ApiProperty()
  stripeCustomerId: string;
}
