import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  ParseFilePipeBuilder,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid } from '../../decorators/slug-uuid.decorator.js';
import { UserId } from '../../decorators/user-id.decorator.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { Messages } from '../../exceptions/text/messages.js';
import { CompanyAdminGuard } from '../../guards/company-admin.guard.js';
import { CompanyUserGuard } from '../../guards/company-user.guard.js';
import { Constants } from '../../helpers/constants/constants.js';
import { ValidationHelper } from '../../helpers/validators/validation-helper.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { SuccessResponse } from '../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { SimpleFoundUserInCompanyInfoDs } from '../user/dto/found-user.dto.js';
import { ITokenExp } from '../user/utils/generate-gwt-token.js';
import { getCookieDomainOptions } from '../user/utils/get-cookie-domain-options.js';
import {
  FoundUserCompanyInfoDs,
  FoundUserEmailCompaniesInfoDs,
  FoundUserFullCompanyInfoDs,
} from './application/data-structures/found-company-info.ds.js';
import { FoundCompanyNameDs } from './application/data-structures/found-company-name.ds.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from './application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { ToggleTestConnectionDisplayModeDs } from './application/data-structures/toggle-test-connections-display-mode.ds.js';
import { UpdateUsers2faStatusInCompanyDs } from './application/data-structures/update-users-2fa-status-in-company.ds.js';
import { FoundCompanyFaviconRO, FoundCompanyLogoRO } from './application/dto/found-company-logo.ro.js';
import { InviteUserInCompanyAndConnectionGroupDto } from './application/dto/invite-user-in-company-and-connection-group.dto.js';
import { RevokeInvitationRequestDto } from './application/dto/revoke-invitation-request.dto.js';
import { SuspendUsersInCompanyDto } from './application/dto/suspend-users-in-company.dto.js';
import { TokenExpirationResponseDto } from './application/dto/token-expiration-response.dto.js';
import { UpdateCompanyNameDto } from './application/dto/update-company-name.dto.js';
import { UpdateUsers2faStatusInCompanyDto } from './application/dto/update-users-2fa-status-in-company.dto.js';
import { UpdateUsersRolesRequestDto } from './application/dto/update-users-roles-resuest.dto.js';
import { VerifyCompanyInvitationRequestDto } from './application/dto/verify-company-invitation-request-dto.js';
import {
  IAddCompanyTabTitle,
  ICheckVerificationLinkAvailable,
  IDeleteCompany,
  IDeleteCompanyTabTitle,
  IDeleteCompanyWhiteLabelImages,
  IFindCompanyFavicon,
  IFindCompanyLogo,
  IFindCompanyTabTitle,
  IGetCompanyName,
  IGetCompanyWhiteLabelProperties,
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
  IUploadCompanyWhiteLabelImages,
  IVerifyInviteUserInCompanyAndConnectionGroup,
} from './use-cases/company-info-use-cases.interface.js';
import { AddCompanyTabTitleDto } from './application/data-structures/add-company-tab-title.dto.js';
import { FoundCompanyTabTitleRO } from './application/data-structures/found-company-tab-title.ro.js';
import { FoundCompanyWhiteLabelPropertiesRO } from './application/dto/found-company-white-label-properties.ro.js';
import { PaidFeatureGuard } from '../../guards/paid-feature.guard.js';
import { isTest } from '../../helpers/app/is-test.js';

@UseInterceptors(SentryInterceptor)
@Controller('company')
@ApiBearerAuth()
@ApiTags('Company')
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
    @Inject(UseCaseType.UPLOAD_COMPANY_LOGO)
    private readonly uploadCompanyLogoUseCase: IUploadCompanyWhiteLabelImages,
    @Inject(UseCaseType.FIND_COMPANY_LOGO)
    private readonly findCompanyLogoUseCase: IFindCompanyLogo,
    @Inject(UseCaseType.DELETE_COMPANY_LOGO)
    private readonly deleteCompanyLogoUseCase: IDeleteCompanyWhiteLabelImages,
    @Inject(UseCaseType.UPLOAD_COMPANY_FAVICON)
    private readonly uploadCompanyFaviconUseCase: IUploadCompanyWhiteLabelImages,
    @Inject(UseCaseType.FIND_COMPANY_FAVICON)
    private readonly findCompanyFaviconUseCase: IFindCompanyFavicon,
    @Inject(UseCaseType.DELETE_COMPANY_FAVICON)
    private readonly deleteCompanyFaviconUseCase: IDeleteCompanyWhiteLabelImages,
    @Inject(UseCaseType.ADD_COMPANY_TAB_TITLE)
    private readonly addCompanyTabTitleUseCase: IAddCompanyTabTitle,
    @Inject(UseCaseType.FIND_COMPANY_TAB_TITLE)
    private readonly findCompanyTabTitleUseCase: IFindCompanyTabTitle,
    @Inject(UseCaseType.DELETE_COMPANY_TAB_TITLE)
    private readonly deleteCompanyTabTitleUseCase: IDeleteCompanyTabTitle,
    @Inject(UseCaseType.GET_COMPANY_WHITE_LABEL_PROPERTIES)
    private readonly findCompanyWhiteLabelPropertiesUseCase: IGetCompanyWhiteLabelProperties,
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
    type: SimpleFoundUserInCompanyInfoDs,
    isArray: true,
  })
  @UseGuards(CompanyUserGuard)
  @Get('users/:companyId')
  async getUsersInCompany(@SlugUuid('companyId') companyId: string): Promise<Array<SimpleFoundUserInCompanyInfoDs>> {
    return await this.getUsersInCompanyUseCase.execute(companyId);
  }

  @ApiOperation({ summary: 'Get companies where user with this email registered' })
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
  @Throttle({ default: { limit: isTest() ? 200 : 5, ttl: 60000 } })
  @Get('my/full')
  async getUserCompanies(@UserId() userId: string): Promise<FoundUserCompanyInfoDs | FoundUserFullCompanyInfoDs> {
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
    @Req() request: Request,
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
      ...getCookieDomainOptions(request.hostname),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, tokenInfo.exp.getTime(), {
      httpOnly: false,
      expires: tokenInfo.exp,
      ...getCookieDomainOptions(request.hostname),
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
    if (displayMode !== 'on' && displayMode !== 'off') {
      throw new BadRequestException(Messages.INVALID_DISPLAY_MODE);
    }
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
    @Req() request: Request,
    @UserId() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuccessResponse> {
    const deleteResult = await this.deleteCompanyUseCase.execute(userId, InTransactionEnum.OFF);

    response.cookie(Constants.JWT_COOKIE_KEY_NAME, '', {
      ...getCookieDomainOptions(request.hostname),
      expires: new Date(0),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      expires: new Date(0),
      httpOnly: false,
      ...getCookieDomainOptions(request.hostname),
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

  @ApiOperation({ summary: 'Upload company logo' })
  @ApiResponse({
    status: 201,
    description: 'Company logo was uploaded.',
    type: SuccessResponse,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyAdminGuard, PaidFeatureGuard)
  @Post('/logo/:companyId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanyLogo(
    @SlugUuid('companyId') companyId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpeg|jpg|svg\+xml)/ })
        .addMaxSizeValidator({ maxSize: Constants.MAX_COMPANY_LOGO_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<SuccessResponse> {
    if (!file) {
      throw new BadRequestException(Messages.FILE_MISSING);
    }
    return await this.uploadCompanyLogoUseCase.execute({ companyId, file }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Find company logo' })
  @ApiResponse({
    status: 200,
    description: 'Company logo found.',
    type: FoundCompanyLogoRO,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyUserGuard)
  @Get('/logo/:companyId')
  async findCompanyLogo(@SlugUuid('companyId') companyId: string): Promise<FoundCompanyLogoRO> {
    return await this.findCompanyLogoUseCase.execute(companyId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete company logo' })
  @ApiResponse({
    status: 200,
    description: 'Company logo deleted.',
    type: SuccessResponse,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyAdminGuard)
  @Delete('/logo/:companyId')
  async deleteCompanyLogo(@SlugUuid('companyId') companyId: string): Promise<SuccessResponse> {
    return await this.deleteCompanyLogoUseCase.execute(companyId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Upload company favicon' })
  @ApiResponse({
    status: 201,
    description: 'Company favicon was uploaded.',
    type: SuccessResponse,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyAdminGuard, PaidFeatureGuard)
  @Post('/favicon/:companyId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanyFavicon(
    @SlugUuid('companyId') companyId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /image\/(png|jpeg|jpg|svg\+xml)/ })
        .addMaxSizeValidator({ maxSize: Constants.MAX_COMPANY_FAVICON_SIZE })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<SuccessResponse> {
    if (!file) {
      throw new BadRequestException(Messages.FILE_MISSING);
    }
    return await this.uploadCompanyFaviconUseCase.execute({ companyId, file }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Find company favicon' })
  @ApiResponse({
    status: 200,
    description: 'Company favicon found.',
    type: FoundCompanyFaviconRO,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyUserGuard)
  @Get('/favicon/:companyId')
  async findCompanyFavicon(@SlugUuid('companyId') companyId: string): Promise<FoundCompanyFaviconRO> {
    return await this.findCompanyFaviconUseCase.execute(companyId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete company favicon' })
  @ApiResponse({
    status: 200,
    description: 'Company favicon deleted.',
    type: SuccessResponse,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyAdminGuard)
  @Delete('/favicon/:companyId')
  async deleteCompanyFavicon(@SlugUuid('companyId') companyId: string): Promise<SuccessResponse> {
    return await this.deleteCompanyFaviconUseCase.execute(companyId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Add company tab title' })
  @ApiResponse({
    status: 200,
    description: 'Company tab title added.',
    type: SuccessResponse,
  })
  @ApiBody({ type: AddCompanyTabTitleDto })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyAdminGuard, PaidFeatureGuard)
  @Post('/tab-title/:companyId')
  async addCompanyTabTitle(
    @SlugUuid('companyId') companyId: string,
    @Body() addCompanyTabTitleDto: AddCompanyTabTitleDto,
  ): Promise<SuccessResponse> {
    const { tab_title } = addCompanyTabTitleDto;
    return await this.addCompanyTabTitleUseCase.execute({ companyId, tab_title }, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Find company tab title' })
  @ApiResponse({
    status: 200,
    description: 'Company tab title found.',
    type: FoundCompanyTabTitleRO,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyUserGuard)
  @Get('/tab-title/:companyId')
  async findCompanyTabTitle(@SlugUuid('companyId') companyId: string): Promise<FoundCompanyTabTitleRO> {
    return await this.findCompanyTabTitleUseCase.execute(companyId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Delete company tab title' })
  @ApiResponse({
    status: 200,
    description: 'Company tab title deleted.',
    type: SuccessResponse,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyAdminGuard)
  @Delete('/tab-title/:companyId')
  async deleteCompanyTabTitle(@SlugUuid('companyId') companyId: string): Promise<SuccessResponse> {
    return await this.deleteCompanyTabTitleUseCase.execute(companyId, InTransactionEnum.OFF);
  }

  @ApiOperation({ summary: 'Get company white label properties' })
  @ApiResponse({
    status: 200,
    description: 'Company white label properties found.',
    type: FoundCompanyWhiteLabelPropertiesRO,
  })
  @ApiParam({ name: 'companyId', required: true })
  @UseGuards(CompanyUserGuard)
  @Get('/white-label-properties/:companyId')
  async getCompanyWhiteLabelProperties(
    @SlugUuid('companyId') companyId: string,
  ): Promise<FoundCompanyWhiteLabelPropertiesRO> {
    return await this.findCompanyWhiteLabelPropertiesUseCase.execute(companyId, InTransactionEnum.OFF);
  }
}
