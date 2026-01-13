import { ApiProperty } from '@nestjs/swagger';

export class DeleteSecretResponseDto {
  @ApiProperty({
    type: String,
    description: 'Confirmation message',
    example: 'Secret deleted successfully',
  })
  message: string;

  @ApiProperty({
    type: Date,
    description: 'Date and time when the secret was deleted',
    example: '2025-01-25T10:30:00.000Z',
  })
  deletedAt: Date;
}
