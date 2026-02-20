import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import dns from 'dns';
import ipRangeCheck from 'ip-range-check';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';

export interface HostCheckData {
	type?: string;
	host?: string;
	ssh?: boolean;
	sshHost?: string;
}

export async function isHostAllowed(connectionData: HostCheckData): Promise<boolean> {
	if (isConnectionTypeAgent(connectionData.type) || process.env.NODE_ENV === 'test') {
		return true;
	}
	if (process.env.NODE_ENV !== 'test' && !isSaaS()) {
		return true;
	}

	return new Promise<boolean>((resolve, reject) => {
		const testHosts = Constants.getTestConnectionsHostNamesArr();
		if (!connectionData.ssh) {
			dns.lookup(connectionData.host, (err, address) => {
				if (err) {
					return reject(err);
				}
				if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) && !testHosts.includes(connectionData.host)) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		} else if (connectionData.ssh && connectionData.sshHost) {
			dns.lookup(connectionData.sshHost, (err, address) => {
				if (err) {
					return reject(err);
				}
				if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) && !testHosts.includes(connectionData.host)) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		}
	}).catch((_e) => {
		throw new HttpException(
			{ message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST },
			HttpStatus.FORBIDDEN,
		);
	});
}
