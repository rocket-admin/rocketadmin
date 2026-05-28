import { Response } from 'express';
import { FindOneConnectionDs } from '../../../connection/application/data-structures/find-one-connection.ds.js';

export class RequestAISettingsCreationDs extends FindOneConnectionDs {
	response: Response;
}
