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
  Delete,
  Query,
} from '@nestjs/common';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { CompanyAdminGuard } from '../../guards/company-admin.guard.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { Messages } from '../../exceptions/text/messages.js';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import {
  ICheckVerificationLinkAvailable,
  IDeleteCompany,
  IGetCompanyName,
  IGetUserCompany,
  IGetUserEmailCompanies,
  IGetUserFullCompanyInfo,
  IGetUsersInCompany,
  IInviteUserInCompanyAndConnectionGroup,
  IRemoveUserFromCompany,
  IRevokeUserInvitationInCompany,
  ISuspendUsersInCompany,
  IToggleCompanyTestConnectionsMode,
  IUpdateCompanyName,
  IUpdateUsers2faStatusInCompany,
  IUpdateUsersCompanyRoles,
  IVerifyInviteUserInCompanyAndConnectionGroup,
} from './use-cases/company-info-use-cases.interface.js';
import { ValidationHelper } from '../../helpers/validators/validation-helper.js';
import { ITokenExp } from '../user/utils/generate-gwt-token.js';
import { Response } from 'express';
import { Constants } from '../../helpers/constants/constants.js';
import { getCookieDomainOptions } from '../user/utils/get-cookie-domain-options.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { SimpleFoundUserInfoDs } from '../user/dto/found-user.dto.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { RevokeInvitationRequestDto } from './application/dto/revoke-invitation-request.dto.js';
import { UpdateCompanyNameDto } from './application/dto/update-company-name.dto.js';
import { FoundCompanyNameDs } from './application/data-structures/found-company-name.ds.js';
import { UpdateUsersRolesRequestDto } from './application/dto/update-users-roles-resuest.dto.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { UpdateUsers2faStatusInCompanyDto } from './application/dto/update-users-2fa-status-in-company.dto.js';
import { UpdateUsers2faStatusInCompanyDs } from './application/data-structures/update-users-2fa-status-in-company.ds.js';
import { SuspendUsersInCompanyDto } from './application/dto/suspend-users-in-company.dto.js';
import { ToggleTestConnectionDisplayModeDs } from './application/data-structures/toggle-test-connections-display-mode.ds.js';

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
    @Inject(UseCaseType.GET_COMPANY_NAME)
    private readonly getCompanyNameUseCase: IGetCompanyName,
    @Inject(UseCaseType.GET_FULL_USER_COMPANIES_INFO)
    private readonly getUserFullCompanyInfoUseCase: IGetUserFullCompanyInfo,
    @Inject(UseCaseType.GET_USER_EMAIL_COMPANIES)
    private readonly getUserEmailCompaniesUseCase: IGetUserEmailCompanies,
    @Inject(UseCaseType.GET_USERS_IN_COMPANY)
    private readonly getUsersInCompanyUseCase: IGetUsersInCompany,
    @Inject(UseCaseType.REMOVE_USER_FROM_COMPANY)
    private readonly removeUserFromCompanyUseCase: IRemoveUserFromCompany,
    @Inject(UseCaseType.REVOKE_INVITATION_IN_COMPANY)
    private readonly revokeInvitationInCompanyUseCase: IRevokeUserInvitationInCompany,
    @Inject(UseCaseType.UPDATE_COMPANY_NAME)
    private readonly updateCompanyNameUseCase: IUpdateCompanyName,
    @Inject(UseCaseType.UPDATE_USERS_COMPANY_ROLES)
    private readonly updateUsersCompanyRolesUseCase: IUpdateUsersCompanyRoles,
    @Inject(UseCaseType.DELETE_COMPANY)
    private readonly deleteCompanyUseCase: IDeleteCompany,
    @Inject(UseCaseType.CHECK_IS_VERIFICATION_LINK_AVAILABLE)
    private readonly checkIsVerificationLinkAvailableUseCase: ICheckVerificationLinkAvailable,
    @Inject(UseCaseType.UPDATE_USERS_2FA_STATUS_IN_COMPANY)
    private readonly updateUses2faStatusInCompanyUseCase: IUpdateUsers2faStatusInCompany,
    @Inject(UseCaseType.SUSPEND_USERS_IN_COMPANY)
    private readonly suspendUsersInCompanyUseCase: ISuspendUsersInCompany,
    @Inject(UseCaseType.UNSUSPEND_USERS_IN_COMPANY)
    private readonly unSuspendUsersInCompanyUseCase: ISuspendUsersInCompany,
    @Inject(UseCaseType.TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE_IN_COMPANY)
    private readonly toggleTestConnectionsCompanyDisplayModeUseCase: IToggleCompanyTestConnectionsMode,
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

  @ApiOperation({ summary: 'Get company name by id' })
  @ApiResponse({
    status: 200,
    description: 'Get company name by id.',
    type: FoundCompanyNameDs,
  })
  @Get('name/:companyId')
  async getCompanyNameById(@Param('companyId') companyId: string): Promise<FoundCompanyNameDs> {
    return await this.getCompanyNameUseCase.execute(companyId);
  }

  @ApiOperation({ summary: 'Get users in company' })
  @ApiResponse({
    status: 200,
    description: 'Get users in company.',
    type: SimpleFoundUserInfoDs,
    isArray: true,
  })
  @UseGuards(CompanyUserGuard)
  @Get('users/:companyId')
  async getUsersInCompany(@SlugUuid('companyId') companyId: string): Promise<Array<SimpleFoundUserInfoDs>> {
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
    console.log('\n CALLED CONTROLLER \n');
    return await this.getUserFullCompanyInfoUseCase.execute(userId);
  }

  @ApiOperation({ summary: 'Invite user in company and connection group' })
  @ApiBody({ type: InviteUserInCompanyAndConnectionGroupDto })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully invited.',
    type: InvitedUserInCompanyAndConnectionGroupDs,
  })
  @UseGuards(CompanyAdminGuard)
  @Put('user/:companyId')
  async inviteUserInCompanyAndConnectionGroup(
    @UserId() userId: string,
    @SlugUuid('companyId') companyId: string,
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

  @ApiOperation({ summary: 'Remove user from company' })
  @ApiResponse({
    status: 200,
    description: 'The user was successfully removed.',
    type: SuccessResponse,
  })
  @UseGuards(CompanyAdminGuard)
  @Delete('/:companyId/user/:userId')
  async removeUserFromCompany(@SlugUuid('userId') userId: string, @SlugUuid('companyId') companyId: string) {
    if (!ValidationHelper.isValidUUID(userId) || !ValidationHelper.isValidUUID(companyId)) {
      throw new HttpException(
        {
          message: Messages.UUID_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.removeUserFromCompanyUseCase.execute({ userId, companyId }, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Revoke invitation in company' })
  @ApiBody({ type: RevokeInvitationRequestDto })
  @ApiResponse({
    status: 200,
    description: 'The invitation in company was revoked.',
    type: SuccessResponse,
  })
  @UseGuards(CompanyAdminGuard)
  @Put('invitation/revoke/:companyId')
  async revokeUserInvitationInCompany(
    @SlugUuid('companyId') companyId: string,
    @Body() revokeInvitationData: RevokeInvitationRequestDto,
  ) {
    const { email } = revokeInvitationData;
    if (!companyId) {
      throw new HttpException(
        {
          message: Messages.COMPANY_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.revokeInvitationInCompanyUseCase.execute({ email, companyId }, InTransactionEnum.ON);
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
    const tokenInfo = await this.verifyInviteUserInCompanyAndConnectionGroupUseCase.execute(
      {
        verificationString,
        userPassword: password,
        userName,
      },
      InTransactionEnum.OFF,
    );
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, tokenInfo.token, {
      httpOnly: true,
      secure: true,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, tokenInfo.exp.getTime(), {
      httpOnly: false,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(),
    });
    return {
      expires: tokenInfo.exp,
      isTemporary: tokenInfo.isTemporary,
    };
  }

  @ApiOperation({ summary: 'Check is verification link is available' })
  @ApiBody({ type: VerifyCompanyInvitationRequestDto })
  @ApiResponse({
    status: 200,
    type: SuccessResponse,
  })
  @Get('/invite/verify/:verificationString')
  async checkIsVerificationLinkAvailable(
    @Param('verificationString') verificationString: string,
  ): Promise<SuccessResponse> {
    if (!verificationString) {
      return {
        success: false,
      };
    }
    return await this.checkIsVerificationLinkAvailableUseCase.execute(verificationString);
  }

  @ApiOperation({ summary: 'Update company name' })
  @ApiBody({ type: UpdateCompanyNameDto })
  @ApiResponse({
    status: 200,
    description: 'Company name was updated.',
    type: SuccessResponse,
  })
  @UseGuards(CompanyAdminGuard)
  @Put('/name/:companyId')
  async updateCompanyName(
    @SlugUuid('companyId') companyId: string,
    @Body() nameData: UpdateCompanyNameDto,
  ): Promise<SuccessResponse> {
    const { name } = nameData;
    return await this.updateCompanyNameUseCase.execute({ name, companyId }, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Set company test connections visibility' })
  @ApiResponse({
    status: 200,
    description: 'Company test connections visibility was updated.',
    type: SuccessResponse,
  })
  @ApiQuery({ name: 'displayMode', required: true, type: 'string', enum: ['on', 'off'] })
  @UseGuards(CompanyAdminGuard)
  @Put('/connections/display/')
  async updateCompanyTestConnectionsVisibility(
    @UserId() userId: string,
    @Query('displayMode') displayMode: string,
  ): Promise<SuccessResponse> {
    const newDisplayMode = displayMode === 'on';
    const inputData: ToggleTestConnectionDisplayModeDs = {
      userId,
      displayMode: newDisplayMode,
    };
    return await this.toggleTestConnectionsCompanyDisplayModeUseCase.execute(inputData, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Update users roles in company' })
  @ApiBody({ type: UpdateUsersRolesRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Users roles in company was updated.',
    type: SuccessResponse,
  })
  @UseGuards(CompanyAdminGuard)
  @Put('/users/roles/:companyId')
  async updateUsersRoles(
    @Param('companyId') companyId: string,
    @Body() usersAndRoles: UpdateUsersRolesRequestDto,
  ): Promise<SuccessResponse> {
    const { users } = usersAndRoles;
    return await this.updateUsersCompanyRolesUseCase.execute({ users, companyId }, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({
    status: 200,
    description: 'Company was deleted.',
    type: SuccessResponse,
  })
  @UseGuards(CompanyAdminGuard)
  @Delete('/my')
  async deleteCompany(
    @UserId() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuccessResponse> {
    const deleteResult = await this.deleteCompanyUseCase.execute(userId, InTransactionEnum.OFF);

    response.cookie(Constants.JWT_COOKIE_KEY_NAME, '', {
      ...getCookieDomainOptions(),
      expires: new Date(0),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      expires: new Date(0),
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return deleteResult;
  }

  @ApiOperation({ summary: 'Update 2fa auth for users in company' })
  @ApiResponse({
    status: 200,
    description: '2fa status updated.',
    type: SuccessResponse,
  })
  @ApiBody({ type: UpdateUsers2faStatusInCompanyDto })
  @UseGuards(CompanyAdminGuard)
  @Put('/2fa/:companyId')
  async update2faAuthForUsersInCompany(
    @SlugUuid('companyId') companyId: string,
    @Body() update2faStatusData: UpdateUsers2faStatusInCompanyDto,
  ): Promise<SuccessResponse> {
    const { is2faEnabled } = update2faStatusData;
    if (!companyId) {
      throw new HttpException(
        {
          message: Messages.COMPANY_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: UpdateUsers2faStatusInCompanyDs = {
      companyId,
      is2faEnabled,
    };
    return await this.updateUses2faStatusInCompanyUseCase.execute(inputData, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Suspend users in company' })
  @ApiResponse({
    status: 200,
    description: 'Users suspended.',
    type: SuccessResponse,
  })
  @ApiBody({ type: SuspendUsersInCompanyDto })
  @UseGuards(CompanyAdminGuard)
  @Put('/users/suspend/:companyId')
  async suspendUsersInCompany(
    @SlugUuid('companyId') companyInfoId: string,
    @Body() { usersEmails }: SuspendUsersInCompanyDto,
  ): Promise<SuccessResponse> {
    return await this.suspendUsersInCompanyUseCase.execute({ companyInfoId, usersEmails }, InTransactionEnum.ON);
  }

  @ApiOperation({ summary: 'Unsuspend users in company' })
  @ApiResponse({
    status: 200,
    description: 'Users unsuspend.',
    type: SuccessResponse,
  })
  @ApiBody({ type: SuspendUsersInCompanyDto })
  @UseGuards(CompanyAdminGuard)
  @Put('/users/unsuspend/:companyId')
  async unSuspendUsersInCompany(
    @SlugUuid('companyId') companyInfoId: string,
    @Body() { usersEmails }: SuspendUsersInCompanyDto,
  ): Promise<SuccessResponse> {
    return await this.unSuspendUsersInCompanyUseCase.execute({ companyInfoId, usersEmails }, InTransactionEnum.ON);
  }
}
