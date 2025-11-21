import { ApiProperty } from '@nestjs/swagger';
import { SecretActionEnum } from '../../../secret-access-log/secret-access-log.entity.js';

export class AuditLogEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SecretActionEnum })
  action: SecretActionEnum;

  @ApiProperty()
  user: {
    id: string;
    email: string;
  };

  @ApiProperty()
  accessedAt: Date;

  @ApiProperty({ required: false })
  ipAddress?: string;

  @ApiProperty({ required: false })
  userAgent?: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  errorMessage?: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ type: [AuditLogEntryDto] })
  data: AuditLogEntryDto[];

  @ApiProperty()
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
