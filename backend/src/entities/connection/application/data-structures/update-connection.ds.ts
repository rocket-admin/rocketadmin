import { ConnectionParametersDs } from './connection-parameters.ds.js';

export class UpdateConnectionDs {
	connection_parameters: ConnectionParametersDs;
	update_info: {
		authorId: string;
		connectionId: string;
		masterPwd: string;
	};
}
