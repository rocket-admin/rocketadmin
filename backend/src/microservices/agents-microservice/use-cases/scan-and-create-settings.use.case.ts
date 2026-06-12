import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import Sentry from '@sentry/minimal';
import { Response } from 'express';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SharedJobsService } from '../../../entities/shared-jobs/shared-jobs.service.js';
import { ConnectionNotFoundException } from '../../../exceptions/custom-exceptions/connection-not-found-exception.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { ScanAndCreateSettingsDs } from '../data-structures/agents.ds.js';
import { IScanAndCreateSettings } from './agents-use-cases.interface.js';

// Streaming variant of the AI settings/widgets scan for the agents
// microservice. Mirrors `RequestAISettingsAndWidgetsCreationUseCase`: the scan
// itself (table discovery, AI generation, validation, persistence) is shared
// with the connection-creation flow via `SharedJobsService` and stays in this
// backend; progress chunks are streamed so the agents service can pipe them
// through to the client unchanged.
@Injectable({ scope: Scope.REQUEST })
export class ScanAndCreateSettingsUseCase
	extends AbstractUseCase<ScanAndCreateSettingsDs, void>
	implements IScanAndCreateSettings
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly sharedJobsService: SharedJobsService,
	) {
		super();
	}

	protected async implementation(inputData: ScanAndCreateSettingsDs): Promise<void> {
		const { connectionId, masterPassword, response } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword as string,
		);
		if (!connection) {
			throw new ConnectionNotFoundException(HttpStatus.BAD_REQUEST);
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
