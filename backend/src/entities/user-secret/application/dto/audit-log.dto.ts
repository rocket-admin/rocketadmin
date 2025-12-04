import { ApiProperty } from '@nestjs/swagger';
import { SecretActionEnum } from '../../../secret-access-log/secret-access-log.entity.js';

export class AuditLogUserDto {
  @ApiProperty({
    type: String,
    description: 'User ID who performed the action',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Email of the user who performed the action',
    example: 'user@example.com',
  })
  email: string;
}

export class AuditLogEntryDto {
  @ApiProperty({
    type: String,
    description: 'Unique identifier of the audit log entry',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  id: string;

  @ApiProperty({
    enum: SecretActionEnum,
    enumName: 'SecretActionEnum',
    description: 'Type of action performed on the secret',
    example: SecretActionEnum.VIEW,
  })
  action: SecretActionEnum;

  @ApiProperty({
    type: AuditLogUserDto,
    description: 'User who performed the action',
  })
  user: AuditLogUserDto;

  @ApiProperty({
    type: Date,
    description: 'Date and time when the action was performed',
    example: '2025-01-25T09:15:00.000Z',
  })
  accessedAt: Date;

  @ApiProperty({
    type: String,
    required: false,
    description: 'IP address from which the action was performed',
    example: '192.168.1.100',
  })
  ipAddress?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'User agent string of the client',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  })
  userAgent?: string;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the action was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Error message if the action failed',
    example: 'Invalid master password',
  })
  errorMessage?: string;
}

export class AuditLogPaginationDto {
  @ApiProperty({
    type: Number,
    description: 'Total number of audit log entries',
    example: 150,
  })
  total: number;

  @ApiProperty({
    type: Number,
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    type: Number,
    description: 'Number of entries per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    type: Number,
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}

export class AuditLogResponseDto {
  @ApiProperty({
    type: AuditLogEntryDto,
    isArray: true,
    description: 'List of audit log entries',
  })
  data: AuditLogEntryDto[];

  @ApiProperty({
    type: AuditLogPaginationDto,
    description: 'Pagination information',
  })
  pagination: AuditLogPaginationDto;
}
