import { ApiProperty } from '@nestjs/swagger';

export class PaginationDs {
  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  lastPage: number;

  @ApiProperty()
  perPage: number;

  @ApiProperty()
  total: number;
}
