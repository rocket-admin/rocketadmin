import { ConnectionParametersDs } from './connection-parameters.ds.js';

export class CreateConnectionDs {
	connection_parameters: ConnectionParametersDs;
	creation_info: {
		authorId: string;
		masterPwd: string;
	};
}
