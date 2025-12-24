import { BadRequestException, Inject, Injectable, Scope } from "@nestjs/common";
import AbstractUseCase from "../../../common/abstract-use.case.js";
import { IGlobalDatabaseContext } from "../../../common/application/global-database-context.interface.js";
import { BaseType } from "../../../common/data-injection.tokens.js";
import { Messages } from "../../../exceptions/text/messages.js";
import { FindOneConnectionDs } from "../../connection/application/data-structures/find-one-connection.ds.js";
import { SharedJobsService } from "../../shared-jobs/shared-jobs.service.js";
import { IAISettingsAndWidgetsCreation } from "../ai-use-cases.interface.js";

@Injectable({ scope: Scope.REQUEST })
export class RequestAISettingsAndWidgetsCreationUseCase
	extends AbstractUseCase<FindOneConnectionDs, void>
	implements IAISettingsAndWidgetsCreation
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly sharedJobsService: SharedJobsService,
	) {
		super();
	}

	public async implementation(
		connectionData: FindOneConnectionDs,
	): Promise<void> {
		const { connectionId, masterPwd } = connectionData;

		const connection =
			await this._dbContext.connectionRepository.findAndDecryptConnection(
				connectionId,
				masterPwd,
			);
		if (!connection) {
			throw new BadRequestException(Messages.CONNECTION_NOT_FOUND);
		}

		await this.sharedJobsService.scanDatabaseAndCreateSettingsAndWidgetsWithAI(
			connection,
		);
	}
}
