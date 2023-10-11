import { ApiProperty } from "@nestjs/swagger";
import { TableAccessLevelsDs } from "../../../permission/application/data-structures/create-permissions.ds.js";

export class FoundTableDs {
  @ApiProperty()
  display_name?: string;

  @ApiProperty()
  table: string;

  @ApiProperty()
  isView: boolean;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  permissions: TableAccessLevelsDs;
}
