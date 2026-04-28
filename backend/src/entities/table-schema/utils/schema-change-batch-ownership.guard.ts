import {
	BadRequestException,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IRequestWithCognitoInfo } from '../../../authorization/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { CedarAction } from '../../cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../cedar-authorization/cedar-authorization.service.js';
import { TableSchemaChangeEntity } from '../table-schema-change.entity.js';

@Injectable()
export class SchemaChangeBatchOwnershipGuard implements CanActivate {
	constructor(
		@InjectRepository(TableSchemaChangeEntity)
		private readonly tableSchemaChangeRepository: Repository<TableSchemaChangeEntity>,
		private readonly cedarAuthService: CedarAuthorizationService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
		const userId = request.decoded.sub;
		const batchId: string = request.params?.batchId;

		if (!batchId || !ValidationHelper.isValidUUID(batchId)) {
			throw new BadRequestException('Invalid or missing batchId.');
		}

		const member = await this.tableSchemaChangeRepository.findOne({
			where: { batchId },
			select: ['id', 'connectionId'],
		});
		if (!member) {
			throw new NotFoundException('Schema change batch not found.');
		}

		const allowed = await this.cedarAuthService.validate({
			userId,
			action: CedarAction.ConnectionEdit,
			connectionId: member.connectionId,
		});
		if (!allowed) {
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}
		return true;
	}
}
