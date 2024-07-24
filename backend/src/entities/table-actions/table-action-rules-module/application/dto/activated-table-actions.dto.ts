import { ApiProperty } from '@nestjs/swagger';
import { OperationResultStatusEnum } from '../../../../../enums/operation-result-status.enum.js';

export class ActionActivationResultsStatusesDTO {
  @ApiProperty({ type: String })
  actionId: string;

  @ApiProperty({ enum: OperationResultStatusEnum })
  result: OperationResultStatusEnum;
}

export class ActivatedTableActionsDTO {
  @ApiProperty({ required: false, type: String })
  location?: string | undefined;

  @ApiProperty({ type: ActionActivationResultsStatusesDTO, isArray: true })
  activationResults: Array<ActionActivationResultsStatusesDTO>;
}
