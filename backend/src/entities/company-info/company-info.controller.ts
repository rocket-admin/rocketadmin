import {
  UseInterceptors,
  Controller,
  Injectable,
  Put,
  UseGuards,
  Body,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CompanyAdminGuard } from '../../guards/company-admin.guard.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { UserRoleEnum } from '../user/enums/user-role.enum.js';
import { BodyEmail } from '../../decorators/body-email.decorator.js';
import { validateStringWithEnum } from '../../helpers/validators/validate-string-with-enum.js';
import { Messages } from '../../exceptions/text/messages.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import {
  IInviteUserInCompanyAndConnectionGroup,
  IVerifyInviteUserInCompanyAndConnectionGroup,
} from './use-cases/company-info-use-cases.interface.js';
import { ValidationHelper } from '../../helpers/validators/validation-helper.js';
import { ITokenExp } from '../user/utils/generate-gwt-token.js';
import { Response } from 'express';
import { Constants } from '../../helpers/constants/constants.js';
import { getCookieDomainOptions } from '../user/utils/get-cookie-domain-options.js';

@UseInterceptors(SentryInterceptor)
@Controller('company')
@Injectable()
export class CompanyInfoController {
  constructor(
    @Inject(UseCaseType.INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP)
    private readonly inviteUserInCompanyAndConnectionGroupUseCase: IInviteUserInCompanyAndConnectionGroup,
    @Inject(UseCaseType.VERIFY_INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP)
    private readonly verifyInviteUserInCompanyAndConnectionGroupUseCase: IVerifyInviteUserInCompanyAndConnectionGroup,
  ) {}

  @UseGuards(CompanyAdminGuard)
  @Put('user/:slug')
  async inviteUserInCompanyAndConnectionGroup(
    @UserId() userId: string,
    @SlugUuid() companyId: string,
    @Body('groupId') groupId: string,
    @BodyEmail('email') email: string,
    @Body('role') role: UserRoleEnum = UserRoleEnum.USER,
  ) {
    if (!validateStringWithEnum(role, UserRoleEnum)) {
      throw new HttpException(
        {
          message: Messages.INVALID_USER_COMPANY_ROLE,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.inviteUserInCompanyAndConnectionGroupUseCase.execute({
      inviterId: userId,
      companyId,
      groupId,
      invitedUserEmail: email,
      invitedUserCompanyRole: role,
    });
  }

  @Post('/invite/verify/:verificationString')
  async verifyCompanyInvitation(
    @Res({ passthrough: true }) response: Response,
    @Param('verificationString') verificationString: string,
    @Body('password') password: string,
    @Body('userName') userName: string,
  ): Promise<ITokenExp> {
    if (!verificationString || !password) {
      throw new HttpException(
        {
          message: Messages.REQUIRED_PARAMETERS_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    ValidationHelper.isPasswordStrongOrThrowError(password);
    const tokenInfo = await this.verifyInviteUserInCompanyAndConnectionGroupUseCase.execute({
      verificationString,
      userPassword: password,
      userName,
    });
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return {
      expires: tokenInfo.exp,
      isTemporary: tokenInfo.isTemporary,
    };
  }
}
