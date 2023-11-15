import { ApiProperty } from "@nestjs/swagger";

export class OtpSecretDS {
  @ApiProperty()
  otpauth_url: string;

  @ApiProperty()
  qrCode: string;
}
