import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import Sentry from '@sentry/minimal';
import { Response } from 'express';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { SharedJobsService } from '../../shared-jobs/shared-jobs.service.js';
import { IAISettingsAndWidgetsCreation } from '../ai-use-cases.interface.js';
import { RequestAISettingsCreationDs } from '../application/data-structures/request-ai-settings-creation.ds.js';

@Injectable({ scope: Scope.REQUEST })
export class RequestAISettingsAndWidgetsCreationUseCase
	extends AbstractUseCase<RequestAISettingsCreationDs, void>
	implements IAISettingsAndWidgetsCreation
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly sharedJobsService: SharedJobsService,
	) {
		super();
	}

	public async implementation(inputData: RequestAISettingsCreationDs): Promise<void> {
		const { connectionId, masterPwd, response } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		if (!connection) {
			throw new BadRequestException(Messages.CONNECTION_NOT_FOUND);
		}

		this.setupResponseHeaders(response);

		try {
			await this.sharedJobsService.scanDatabaseAndCreateSettingsAndWidgetsWithAI(connection, (chunk) =>
				this.writeChunk(response, chunk),
			);
			this.writeChunk(response, { type: 'complete' });
			response.end();
		} catch (error) {
			Sentry.captureException(error);
			if (!response.headersSent) {
				response.status(500).send({ error: 'An error occurred while processing your request.' });
				return;
			}
			this.writeChunk(response, { type: 'error', message: getErrorMessage(error) });
			response.end();
		}
	}

	private setupResponseHeaders(response: Response): void {
		response.setHeader('Content-Type', 'text/event-stream');
		response.setHeader('Cache-Control', 'no-cache');
		response.setHeader('Connection', 'keep-alive');
	}

	private writeChunk(
		response: Response,
		chunk: { type: 'message'; text: string } | { type: 'complete' } | { type: 'error'; message: string },
	): void {
		response.write(JSON.stringify(chunk) + '\n');
	}
}
