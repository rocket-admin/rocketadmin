import { HttpException, Injectable } from '@nestjs/common';
import { BaseSaasGatewayService } from './base-saas-gateway.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { SuccessResponse } from '../../saas-microservice/data-structures/common-responce.ds.js';

@Injectable()
export class SaasUserGatewayService extends BaseSaasGatewayService {
  constructor() {
    super();
  }

  public async deleteUserInSaas(userId: string): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/user/delete`, 'POST', {
      userId,
    });

    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_DELETE_USER_ACCOUNT_IN_SAAS,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }

  public async updateUserEmailInSaas(userId: string, newEmail: string): Promise<SuccessResponse | null> {
    const result = await this.sendRequestToSaaS(`/webhook/user/email/update`, 'POST', {
      userId,
      newEmail: newEmail?.toLowerCase(),
    });

    if (result.status > 299) {
      throw new HttpException(
        {
          message: Messages.FAILED_UPDATE_USER_EMAIL_IN_SAAS,
        },
        result.status,
      );
    }
    if (!isObjectEmpty(result.body)) {
      return {
        success: result.body.success as boolean,
      };
    }
    return null;
  }
}
