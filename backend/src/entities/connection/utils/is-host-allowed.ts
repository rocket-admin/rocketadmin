import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import dns from 'dns';
import ipRangeCheck from 'ip-range-check';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';

export interface HostCheckData {
	type?: string;
	host?: string;
	ssh?: boolean;
	sshHost?: string;
}

export async function isHostAllowed(connectionData: HostCheckData): Promise<boolean> {
	if (isConnectionTypeAgent(connectionData.type) || isTest()) {
		return true;
	}
	if (!isTest() && !isSaaS()) {
		return true;
	}

	const hostnameToCheck = connectionData.ssh ? connectionData.sshHost : connectionData.host;
	if (!hostnameToCheck) {
		return true;
	}

	const testHosts = Constants.getTestConnectionsHostNamesArr();
	if (testHosts.includes(connectionData.host ?? '')) {
		return true;
	}

	return new Promise<boolean>((resolve, reject) => {
		dns.lookup(hostnameToCheck, { all: true }, (err, addresses) => {
			if (err) {
				return reject(err);
			}
			const anyForbidden = addresses.some(({ address }) => isForbiddenAddress(address));
			resolve(!anyForbidden);
		});
	}).catch((_e) => {
		throw new HttpException({ message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST }, HttpStatus.FORBIDDEN);
	});
}

export function isForbiddenAddress(address: string): boolean {
	const normalized = address.startsWith('::ffff:') && address.includes('.') ? address.slice('::ffff:'.length) : address;
	return ipRangeCheck(normalized, Constants.FORBIDDEN_HOSTS);
}
