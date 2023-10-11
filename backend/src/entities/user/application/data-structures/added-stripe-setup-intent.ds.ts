import { ApiProperty } from '@nestjs/swagger';

export class AddedStripeSetupIntentDs {
  @ApiProperty()
  success: boolean;
}
