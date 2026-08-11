import { ApiProperty } from '@nestjs/swagger';
import { OutgoingEmailPayloadDs } from '../../../email/application/data-structures/outgoing-email-payload.ds.js';

export class OperationResultMessageDs {
	@ApiProperty()
	message: string;
}

// Returned by the email-flow use cases shared between the public routes and the /saas/* bridges:
// `emailPayload` is populated only when the bridge caller set `suppressEmail: true` (plan 15
// Phase 2) — public routes never set the flag, so their responses stay a bare `{message}`.
export class OperationResultMessageWithEmailPayloadDs extends OperationResultMessageDs {
	@ApiProperty({ required: false, type: OutgoingEmailPayloadDs })
	emailPayload?: OutgoingEmailPayloadDs;
}
