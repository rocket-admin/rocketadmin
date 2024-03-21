import { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import dns from 'dns';
import ipRangeCheck from 'ip-range-check';
import validator from 'validator';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent, toPrettyErrorsMsg } from '../../../helpers/index.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { ConnectionTypeTestEnum } from '../../../enums/connection-type.enum.js';

export async function validateCreateConnectionData(
  createConnectionData: CreateConnectionDs | UpdateConnectionDs,
): Promise<boolean> {
  const {
    connection_parameters: { port, ssh, sshHost, sshPort, title, host, sshUsername, username, database, type },
  } = createConnectionData;
  const errors: Array<string> = [];
  if (!type) errors.push(Messages.TYPE_MISSING);
  if (!validateConnectionType(type)) errors.push(Messages.CONNECTION_TYPE_INVALID);
  if (!isConnectionTypeAgent(type)) {
    if (!host) {
      errors.push(Messages.HOST_MISSING);
    }
    if (ssh) {
      if (!validator.isFQDN(host) && !validator.isIP(host)) {
        errors.push(Messages.HOST_NAME_INVALID);
        throw new HttpException(
          {
            message: toPrettyErrorsMsg(errors),
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (port < 0 || port > 65535 || !port) errors.push(Messages.PORT_MISSING);
    if (typeof port !== 'number') errors.push(Messages.PORT_FORMAT_INCORRECT);
    if (!username) errors.push(Messages.USERNAME_MISSING);
    if (!database) errors.push(Messages.DATABASE_MISSING);
    if (typeof ssh !== 'boolean') errors.push(Messages.SSH_FORMAT_INCORRECT);
    if (ssh) {
      if (typeof sshPort !== 'number') {
        errors.push(Messages.SSH_PORT_FORMAT_INCORRECT);
      }
      if (!sshPort) errors.push(Messages.SSH_PORT_MISSING);
      if (!sshUsername) errors.push(Messages.SSH_USERNAME_MISSING);
      if (!sshHost) errors.push(Messages.SSH_HOST_MISSING);
    }
  } else {
    if (!title) errors.push('Connection title missing');
  }

  if (errors.length > 0) {
    throw new HttpException(
      {
        message: toPrettyErrorsMsg(errors),
      },
      HttpStatus.BAD_REQUEST,
    );
  } else {
    const checkingResult = await checkIsHostAllowed(createConnectionData);
    if (!checkingResult) {
      throw new HttpException(
        {
          message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}

function validateConnectionType(type: string): string {
  if (process.env.NODE_ENV === 'test') {
    return Object.keys(ConnectionTypeTestEnum).find((key) => key === type);
  }
  return Object.keys(ConnectionTypesEnum).find((key) => key === type);
}

async function checkIsHostAllowed(createConnectionData: CreateConnectionDs | UpdateConnectionDs): Promise<boolean> {
  if (isConnectionTypeAgent(createConnectionData.connection_parameters.type) || process.env.NODE_ENV === 'test') {
    return true;
  }
  if (process.env.NODE_ENV !== 'test' && !isSaaS()) {
    return true;
  }
  return new Promise<boolean>((resolve, reject) => {
    const testHosts = Constants.getTestConnectionsHostNamesArr();
    if (!createConnectionData.connection_parameters.ssh) {
      dns.lookup(createConnectionData.connection_parameters.host, (err, address) => {
        if (
          ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) &&
          !testHosts.includes(createConnectionData.connection_parameters.host)
        ) {
          resolve(false);
        } else {
          resolve(true);
        }
        if (err) {
          reject(err);
        }
      });
    } else if (createConnectionData.connection_parameters.ssh && createConnectionData.connection_parameters.sshHost) {
      dns.lookup(createConnectionData.connection_parameters.sshHost, (err, address) => {
        if (
          ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) &&
          !testHosts.includes(createConnectionData.connection_parameters.host)
        ) {
          resolve(false);
        } else {
          resolve(true);
        }
        if (err) {
          reject(err);
        }
      });
    }
  }).catch((e) => {
    console.error('DNS lookup error message', e.message);
    return false;
  });
}
