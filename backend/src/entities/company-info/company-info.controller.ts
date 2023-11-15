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
  Get,
} from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CompanyAdminGuard } from '../../guards/company-admin.guard.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { Messages } from '../../exceptions/text/messages.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import {
  IGetUserCompany,
  IGetUserEmailCompanies,
  IGetUserFullCompanyInfo,
  IGetUsersInCompany,
  IInviteUserInCompanyAndConnectionGroup,
  IVerifyInviteUserInCompanyAndConnectionGroup,
} from './use-cases/company-info-use-cases.interface.js';
import { ValidationHelper } from '../../helpers/validators/validation-helper.js';
import { ITokenExp } from '../user/utils/generate-gwt-token.js';
import { Response } from 'express';
import { Constants } from '../../helpers/constants/constants.js';
import { getCookieDomainOptions } from '../user/utils/get-cookie-domain-options.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitedUserInCompanyAndConnectionGroupDs } from './application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { InviteUserInCompanyAndConnectionGroupDto } from './application/dto/invite-user-in-company-and-connection-group.dto.js';
import { VerifyCompanyInvitationRequestDto } from './application/dto/verify-company-invitation-request-dto.js';
import { TokenExpirationResponseDto } from './application/dto/token-expiration-response.dto.js';
import { CompanyUserGuard } from '../../guards/company-user.guard.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserEmailCompaniesInfoDs,
  FoundUserFullCompanyInfoDs,
} from './application/data-structures/found-company-info.ds.js';
import { SimpleFoundUserInfoDs } from '../user/application/data-structures/found-user.ds.js';

@UseInterceptors(SentryInterceptor)
@Controller('company')
@ApiBearerAuth()
@ApiTags('company')
@Injectable()
export class CompanyInfoController {
  constructor(
    @Inject(UseCaseType.INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP)
    private readonly inviteUserInCompanyAndConnectionGroupUseCase: IInviteUserInCompanyAndConnectionGroup,
    @Inject(UseCaseType.VERIFY_INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP)
    private readonly verifyInviteUserInCompanyAndConnectionGroupUseCase: IVerifyInviteUserInCompanyAndConnectionGroup,
    @Inject(UseCaseType.GET_USER_COMPANY)
    private readonly getUserCompanyUseCase: IGetUserCompany,
    @Inject(UseCaseType.GET_FULL_USER_COMPANIES_INFO)
    private readonly getUserFullCompanyInfoUseCase: IGetUserFullCompanyInfo,
    @Inject(UseCaseType.GET_USER_EMAIL_COMPANIES)
    private readonly getUserEmailCompaniesUseCase: IGetUserEmailCompanies,
    @Inject(UseCaseType.GET_USERS_IN_COMPANY)
    private readonly getUsersInCompanyUseCase: IGetUsersInCompany,
  ) {}

  @ApiOperation({ summary: 'Get user company' })
  @ApiResponse({
    status: 200,
    description: 'Get user company.',
    type: FoundUserCompanyInfoDs,
  })
  @UseGuards(CompanyUserGuard)
  @Get('my')
  async getUserCompany(@UserId() userId: string): Promise<FoundUserCompanyInfoDs> {
    return await this.getUserCompanyUseCase.execute(userId);
  }

  @ApiOperation({ summary: 'Get users in company' })
  @ApiResponse({
    status: 200,
    description: 'Get users in company.',
    type: SimpleFoundUserInfoDs,
    isArray: true,
  })
  @UseGuards(CompanyUserGuard)
  @Get('users/:slug')
  async getUsersInCompany(@SlugUuid() companyId: string): Promise<Array<SimpleFoundUserInfoDs>> {
    return await this.getUsersInCompanyUseCase.execute(companyId);
  }

  @ApiOperation({ summary: 'Get companies where user with this email registered (for login in company)' })
  @ApiResponse({
    status: 200,
    description: 'Get companies where user with this email registered.',
    type: FoundUserEmailCompaniesInfoDs,
    isArray: true,
  })
  @Get('my/email/:email')
  async getUserEmailCompanies(@Param('email') userEmail: string): Promise<Array<FoundUserEmailCompaniesInfoDs>> {
    ValidationHelper.validateOrThrowHttpExceptionEmail(userEmail);
    return await this.getUserEmailCompaniesUseCase.execute(userEmail);
  }

  @ApiOperation({ summary: 'Get user company full info' })
  @ApiResponse({
    status: 200,
    description: 'Get user company full info.',
    type: FoundUserFullCompanyInfoDs,
  })
  @UseGuards(CompanyUserGuard)
  @Get('my/full')
  async getUserCompanies(@UserId() userId: string): Promise<FoundUserCompanyInfoDs | FoundUserFullCompanyInfoDs> {
    return await this.getUserFullCompanyInfoUseCase.execute(userId);
  }

  @ApiOperation({ summary: 'Invite user in company and connection group' })
  @ApiBody({ type: InviteUserInCompanyAndConnectionGroupDto })
  @ApiResponse({
    status: 200,
    description: 'The company has been successfully invited.',
    type: InvitedUserInCompanyAndConnectionGroupDs,
  })
  @UseGuards(CompanyAdminGuard)
  @Put('user/:slug')
  async inviteUserInCompanyAndConnectionGroup(
    @UserId() userId: string,
    @SlugUuid() companyId: string,
    @Body() inviteUserData: InviteUserInCompanyAndConnectionGroupDto,
  ) {
    const { email, groupId, role } = inviteUserData;
    return await this.inviteUserInCompanyAndConnectionGroupUseCase.execute({
      inviterId: userId,
      companyId,
      groupId,
      invitedUserEmail: email,
      invitedUserCompanyRole: role,
    });
  }

  @ApiOperation({ summary: 'Verify invitation in company' })
  @ApiBody({ type: VerifyCompanyInvitationRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User was successfully invited.',
    type: TokenExpirationResponseDto,
  })
  @Post('/invite/verify/:verificationString')
  async verifyCompanyInvitation(
    @Res({ passthrough: true }) response: Response,
    @Param('verificationString') verificationString: string,
    @Body() verificationData: VerifyCompanyInvitationRequestDto,
  ): Promise<ITokenExp> {
    const { password, userName } = verificationData;
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
