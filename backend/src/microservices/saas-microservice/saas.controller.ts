import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Inject,
	Injectable,
	Param,
	Post,
	Put,
	Query,
	UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { VerificationString } from '../../decorators/slug-verification.decorator.js';
import { Timeout } from '../../decorators/timeout.decorator.js';
import {
	AcceptedCompanyInvitationDs,
	AcceptUserValidationInCompany,
} from '../../entities/company-info/application/data-structures/accept-user-invitation-in-company.ds.js';
import { FoundUserEmailCompaniesInfoDs } from '../../entities/company-info/application/data-structures/found-company-info.ds.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../../entities/company-info/application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { VerifyCompanyInvitationRequestDto } from '../../entities/company-info/application/dto/verify-company-invitation-request-dto.js';
import { CompanyInfoEntity } from '../../entities/company-info/company-info.entity.js';
import {
	IInviteUserInCompanyAndConnectionGroup,
	IVerifyInviteUserInCompanyAndConnectionGroup,
} from '../../entities/company-info/use-cases/company-info-use-cases.interface.js';
import { CreatedConnectionDTO } from '../../entities/connection/application/dto/created-connection.dto.js';
import { ChangeUsualUserPasswordDs } from '../../entities/user/application/data-structures/change-usual-user-password.ds.js';
import {
	OperationResultMessageDs,
	OperationResultMessageWithEmailPayloadDs,
} from '../../entities/user/application/data-structures/operation-result-message.ds.js';
import { OtpSecretDS } from '../../entities/user/application/data-structures/otp-secret.ds.js';
import {
	OtpDisablingResultDS,
	OtpValidationResultDS,
} from '../../entities/user/application/data-structures/otp-validation-result.ds.js';
import { RegisteredUserDs } from '../../entities/user/application/data-structures/registered-user.ds.js';
import { SaveUserSettingsDs } from '../../entities/user/application/data-structures/save-user-settings.ds.js';
import { SaasUsualUserRegisterDS } from '../../entities/user/application/data-structures/usual-register-user.ds.js';
import { FoundUserDto } from '../../entities/user/dto/found-user.dto.js';
import { PasswordDto } from '../../entities/user/dto/password.dto.js';
import { UserSettingsDataRequestDto } from '../../entities/user/dto/user-settings-data-request.dto.js';
import { ExternalRegistrationProviderEnum } from '../../entities/user/enums/external-registration-provider.enum.js';
import {
	IChangeUserName,
	IDeleteUserAccount,
	IDisableOTP,
	IFindUserUseCase,
	IGenerateOTP,
	IGetUserSettings,
	ILogOut,
	IRequestEmailChange,
	IRequestEmailVerification,
	IRequestPasswordReset,
	ISaveUserSettings,
	IToggleTestConnectionsMode,
	IUsualPasswordChange,
	IVerifyEmail,
	IVerifyEmailChange,
	IVerifyOTP,
	IVerifyPasswordReset,
} from '../../entities/user/use-cases/user-use-cases.interfaces.js';
import { UserEntity } from '../../entities/user/user.entity.js';
import { IToken } from '../../entities/user/utils/generate-gwt-token.js';
import { InTransactionEnum } from '../../enums/in-transaction.enum.js';
import { Messages } from '../../exceptions/text/messages.js';
import { slackPostMessage } from '../../helpers/slack/slack-post-message.js';
import { ValidationHelper } from '../../helpers/validators/validation-helper.js';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor.js';
import { ValidatedUserTokenRO } from '../agents-microservice/data-structures/agents-responses.ds.js';
import { ValidateUserTokenDto } from '../agents-microservice/dto/agents-auth.dtos.js';
import { IValidateUserToken } from '../agents-microservice/use-cases/agents-use-cases.interface.js';
import { CreatedConnectionResponse, SuccessResponse } from './data-structures/common-responce.ds.js';
import { CreateConnectionForHostedDbDto } from './data-structures/create-connecttion-for-selfhosted-db.dto.js';
import { DeleteConnectionForHostedDbDto } from './data-structures/delete-connection-for-hosted-db.dto.js';
import { FoundConnectionInfoRO } from './data-structures/found-connection-info.ro.js';
import { FoundUserInfoRO, FoundUserInfoWithoutCompanyRO } from './data-structures/found-user-info.ro.js';
import { GetConnectionsInfoByIdsDS } from './data-structures/get-connections-info-by-ids.ds.js';
import { GetHostedConnectionCredentialsDto } from './data-structures/get-hosted-connection-credentials.dto.js';
import { HostedConnectionCredentialsRO } from './data-structures/hosted-connection-credentials.ro.js';
import { RegisterCompanyWebhookDS } from './data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from './data-structures/registered-company.ds.js';
import {
	SaasInviteUserInCompanyDto,
	SaasRegisteredUserRO,
	SaasRequestPasswordResetDto,
	SaasUserIdWithLinkBaseDto,
	SaasVerifyEmailChangeDto,
} from './data-structures/saas-email-flows.dtos.js';
import { SaasOtpLoginDs } from './data-structures/saas-otp-login.ds.js';
import { SaasRegisterUserWithGithub } from './data-structures/saas-register-user-with-github.js';
import { SaasSAMLUserRegisterDS } from './data-structures/saas-saml-user-register.ds.js';
import {
	SaasChangeUserNameDto,
	SaasDeleteUserAccountDto,
	SaasOtpCodeDto,
	SaasOtpLoginDto,
	SaasSaveUserSettingsDto,
	SaasToggleTestConnectionsDto,
	SaasUserIdDto,
	SaasUserPasswordChangeDto,
} from './data-structures/saas-user-account.dtos.js';
import { SaasRegisterUserWithGoogleDS } from './data-structures/sass-register-user-with-google.js';
import { UpdateHostedConnectionPasswordDto } from './data-structures/update-hosted-connection-password.dto.js';
import {
	ICompanyRegistration,
	ICreateConnectionForHostedDb,
	IDeleteConnectionForHostedDb,
	IFreezeConnectionsInCompany,
	IGetConnectionsInfoByIds,
	IGetHostedConnectionCredentials,
	IGetUserInfo,
	ILoginUserWithGitHub,
	ILoginUserWithGoogle,
	ISaaSGetCompanyInfoByUserId,
	ISaaSGetUsersCountInCompany,
	ISaasDemoRegisterUser,
	ISaasGetUserEmailCompanies,
	ISaasGetUsersInfosByEmail,
	ISaasOtpLogin,
	ISaasRegisterUser,
	ISaasSAMLRegisterUser,
	ISaasUsualLoginUser,
	ISuspendUsers,
	ISuspendUsersOverLimit,
	IUpdateHostedConnectionPassword,
} from './use-cases/saas-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@SkipThrottle()
@Timeout()
@Controller('saas')
@ApiBearerAuth()
@ApiTags('saas')
@Injectable()
export class SaasController {
	constructor(
		@Inject(UseCaseType.LOG_OUT)
		private readonly logOutUseCase: ILogOut,
		@Inject(UseCaseType.AGENTS_VALIDATE_USER_TOKEN)
		private readonly validateUserTokenUseCase: IValidateUserToken,
		@Inject(UseCaseType.SAAS_COMPANY_REGISTRATION)
		private readonly companyRegistrationUseCase: ICompanyRegistration,
		@Inject(UseCaseType.SAAS_GET_USER_INFO)
		private readonly getUserInfoUseCase: IGetUserInfo,
		@Inject(UseCaseType.SAAS_SAAS_GET_USERS_INFOS_BY_EMAIL)
		private readonly getUsersInfosByEmailUseCase: ISaasGetUsersInfosByEmail,
		@Inject(UseCaseType.SAAS_USUAL_REGISTER_USER)
		private readonly usualRegisterUserUseCase: ISaasRegisterUser,
		@Inject(UseCaseType.SAAS_USUAL_LOGIN_USER)
		private readonly usualLoginUserUseCase: ISaasUsualLoginUser,
		@Inject(UseCaseType.SAAS_GET_USER_EMAIL_COMPANIES)
		private readonly getUserEmailCompaniesUseCase: ISaasGetUserEmailCompanies,
		@Inject(UseCaseType.SAAS_DEMO_USER_REGISTRATION)
		private readonly demoRegisterUserUseCase: ISaasDemoRegisterUser,
		@Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GOOGLE)
		private readonly loginUserWithGoogleUseCase: ILoginUserWithGoogle,
		@Inject(UseCaseType.SAAS_LOGIN_USER_WITH_GITHUB)
		private readonly loginUserWithGithubUseCase: ILoginUserWithGitHub,
		@Inject(UseCaseType.SAAS_REGISTER_USER_WITH_SAML)
		private readonly registerUserWithSamlUseCase: ISaasSAMLRegisterUser,
		@Inject(UseCaseType.SAAS_SUSPEND_USERS)
		private readonly suspendUsersUseCase: ISuspendUsers,
		@Inject(UseCaseType.SAAS_SUSPEND_USERS_OVER_LIMIT)
		private readonly suspendUsersOverLimitUseCase: ISuspendUsersOverLimit,
		@Inject(UseCaseType.SAAS_GET_COMPANY_INFO_BY_USER_ID)
		private readonly getCompanyInfoByUserIdUseCase: ISaaSGetCompanyInfoByUserId,
		@Inject(UseCaseType.SAAS_GET_USERS_COUNT_IN_COMPANY)
		private readonly getUsersCountInCompanyByIdUseCase: ISaaSGetUsersCountInCompany,
		@Inject(UseCaseType.FREEZE_CONNECTIONS_IN_COMPANY)
		private readonly freezeConnectionsInCompanyUseCase: IFreezeConnectionsInCompany,
		@Inject(UseCaseType.UNFREEZE_CONNECTIONS_IN_COMPANY)
		private readonly unfreezeConnectionsInCompanyUseCase: IFreezeConnectionsInCompany,
		@Inject(UseCaseType.SAAS_CREATE_CONNECTION_FOR_HOSTED_DB)
		private readonly createConnectionForHostedDbUseCase: ICreateConnectionForHostedDb,
		@Inject(UseCaseType.SAAS_DELETE_CONNECTION_FOR_HOSTED_DB)
		private readonly deleteConnectionForHostedDbUseCase: IDeleteConnectionForHostedDb,
		@Inject(UseCaseType.SAAS_UPDATE_HOSTED_CONNECTION_PASSWORD)
		private readonly updateHostedConnectionPasswordUseCase: IUpdateHostedConnectionPassword,
		@Inject(UseCaseType.SAAS_GET_CONNECTIONS_INFO_BY_IDS)
		private readonly getConnectionsInfoByIdsUseCase: IGetConnectionsInfoByIds,
		@Inject(UseCaseType.SAAS_GET_HOSTED_CONNECTION_CREDENTIALS)
		private readonly getHostedConnectionCredentialsUseCase: IGetHostedConnectionCredentials,
		@Inject(UseCaseType.VERIFY_EMAIL)
		private readonly verifyEmailUseCase: IVerifyEmail,
		@Inject(UseCaseType.REQUEST_RESET_USER_PASSWORD)
		private readonly requestResetUserPasswordUseCase: IRequestPasswordReset,
		@Inject(UseCaseType.VERIFY_RESET_USER_PASSWORD)
		private readonly verifyResetUserPasswordUseCase: IVerifyPasswordReset,
		@Inject(UseCaseType.REQUEST_CHANGE_USER_EMAIL)
		private readonly requestChangeUserEmailUseCase: IRequestEmailChange,
		@Inject(UseCaseType.VERIFY_EMAIL_CHANGE)
		private readonly verifyChangeUserEmailUseCase: IVerifyEmailChange,
		@Inject(UseCaseType.VERIFY_EMAIL_REQUEST)
		private readonly requestEmailVerificationUseCase: IRequestEmailVerification,
		@Inject(UseCaseType.INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP)
		private readonly inviteUserInCompanyUseCase: IInviteUserInCompanyAndConnectionGroup,
		@Inject(UseCaseType.VERIFY_INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP)
		private readonly verifyInviteUserInCompanyUseCase: IVerifyInviteUserInCompanyAndConnectionGroup,
		@Inject(UseCaseType.FIND_USER)
		private readonly findUserUseCase: IFindUserUseCase,
		@Inject(UseCaseType.CHANGE_USUAL_PASSWORD)
		private readonly changeUsualPasswordUseCase: IUsualPasswordChange,
		@Inject(UseCaseType.CHANGE_USER_NAME)
		private readonly changeUserNameUseCase: IChangeUserName,
		@Inject(UseCaseType.DELETE_USER_ACCOUNT)
		private readonly deleteUserAccountUseCase: IDeleteUserAccount,
		@Inject(UseCaseType.SAVE_USER_SESSION_SETTINGS)
		private readonly saveUserSessionSettingsUseCase: ISaveUserSettings,
		@Inject(UseCaseType.GET_USER_SESSION_SETTINGS)
		private readonly getUserSessionSettingsUseCase: IGetUserSettings,
		@Inject(UseCaseType.TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE)
		private readonly toggleTestConnectionsDisplayModeUseCase: IToggleTestConnectionsMode,
		@Inject(UseCaseType.GENERATE_OTP)
		private readonly generateOtpUseCase: IGenerateOTP,
		@Inject(UseCaseType.VERIFY_OTP)
		private readonly verifyOtpUseCase: IVerifyOTP,
		@Inject(UseCaseType.DISABLE_OTP)
		private readonly disableOtpUseCase: IDisableOTP,
		@Inject(UseCaseType.SAAS_OTP_LOGIN)
		private readonly saasOtpLoginUseCase: ISaasOtpLogin,
	) {}

	@ApiOperation({ summary: 'Company registered webhook' })
	@ApiBody({ type: RegisterCompanyWebhookDS })
	@ApiResponse({
		status: 201,
		description: 'The company has been successfully created.',
		type: RegisteredCompanyDS,
	})
	@Post('/company/registered')
	async companyRegistered(
		@Body('userId') registrarUserId: string,
		@Body('companyId') companyId: string,
		@Body('companyName') companyName: string,
	): Promise<RegisteredCompanyDS> {
		const result = await this.companyRegistrationUseCase.execute({ companyId, registrarUserId, companyName });
		return result;
	}

	@ApiOperation({ summary: 'Get user info by id webhook' })
	@ApiBody({ type: RegisterCompanyWebhookDS })
	@ApiResponse({
		status: 200,
	})
	@Get('/user/:userId')
	async getUserInfo(@Param('userId') userId: string, @Query('companyId') companyId: string): Promise<FoundUserInfoRO> {
		return await this.getUserInfoUseCase.execute({ userId, companyId });
	}

	@ApiOperation({ summary: 'Get users infos by email webhook' })
	@ApiBody({ type: Array<RegisterCompanyWebhookDS> })
	@ApiResponse({
		status: 200,
	})
	@Get('/users/email/:userEmail')
	async getUsersInfoByEmail(
		@Param('userEmail') userEmail: string,
		@Query('externalProvider') externalProvider: ExternalRegistrationProviderEnum,
	): Promise<Array<FoundUserInfoWithoutCompanyRO>> {
		return await this.getUsersInfosByEmailUseCase.execute({ userEmail, externalProvider });
	}

	@ApiOperation({ summary: 'User register webhook' })
	@ApiBody({ type: SaasUsualUserRegisterDS })
	@ApiResponse({
		status: 201,
		description: 'User has been successfully registered.',
		type: SaasRegisteredUserRO,
	})
	@Post('user/register')
	async usualUserRegister(
		@Body('email') email: string,
		@Body('password') password: string,
		@Body('gclidValue') gclidValue: string,
		@Body('name') name: string,
		@Body('companyId') companyId: string,
		@Body('companyName') companyName: string,
		@Body('emailVerificationLinkBase') emailVerificationLinkBase: string,
		@Body('suppressEmail') suppressEmail: boolean,
	): Promise<SaasRegisteredUserRO> {
		if (!companyId) {
			throw new BadRequestException(Messages.COMPANY_ID_MISSING);
		}
		return await this.usualRegisterUserUseCase.execute({
			email,
			password,
			gclidValue,
			name,
			companyId,
			companyName,
			emailVerificationLinkBase,
			suppressEmail: suppressEmail === true,
		});
	}

	// NOTE: declared before `user/email/verify/:verificationString` so the literal `request`
	// segment is not captured as a verification token.
	@ApiOperation({ summary: 'Re-send the email-confirmation letter on behalf of the SaaS service' })
	@ApiBody({ type: SaasUserIdWithLinkBaseDto })
	@ApiResponse({ status: 201, type: OperationResultMessageWithEmailPayloadDs })
	@Post('user/email/verify/request')
	async requestSaasUserEmailVerification(
		@Body() body: SaasUserIdWithLinkBaseDto,
	): Promise<OperationResultMessageWithEmailPayloadDs> {
		return await this.requestEmailVerificationUseCase.execute(
			{
				userId: body.userId,
				verificationLinkBase: body.verificationLinkBase,
				suppressEmail: body.suppressEmail === true,
			},
			InTransactionEnum.ON,
		);
	}

	@ApiOperation({ summary: 'Verify user email on behalf of the SaaS service' })
	@ApiResponse({
		status: 201,
		description: 'Email verified — the user is activated and the verification token is consumed.',
		type: OperationResultMessageDs,
	})
	@Post('user/email/verify/:verificationString')
	async verifySaasUserEmail(
		@VerificationString('verificationString') verificationString: string,
	): Promise<OperationResultMessageDs> {
		return await this.verifyEmailUseCase.execute(verificationString, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Request a password-reset email on behalf of the SaaS service' })
	@ApiBody({ type: SaasRequestPasswordResetDto })
	@ApiResponse({ status: 201, type: OperationResultMessageWithEmailPayloadDs })
	@Post('user/password/reset/request')
	async requestSaasUserPasswordReset(
		@Body() body: SaasRequestPasswordResetDto,
	): Promise<OperationResultMessageWithEmailPayloadDs> {
		return await this.requestResetUserPasswordUseCase.execute(
			{
				email: body.email,
				companyId: body.companyId,
				verificationLinkBase: body.verificationLinkBase,
				suppressEmail: body.suppressEmail === true,
			},
			InTransactionEnum.ON,
		);
	}

	@ApiOperation({ summary: 'Consume a password-reset token on behalf of the SaaS service' })
	@ApiBody({ type: PasswordDto })
	@ApiResponse({
		status: 201,
		description:
			'Password replaced; returns the user identity (the core-signed token is ignored by the SaaS caller, ' +
			'which signs its own cookie).',
		type: RegisteredUserDs,
	})
	@Post('user/password/reset/verify/:verificationString')
	async verifySaasUserPasswordReset(
		@VerificationString('verificationString') verificationString: string,
		@Body() passwordData: PasswordDto,
	): Promise<RegisteredUserDs> {
		return await this.verifyResetUserPasswordUseCase.execute(
			{ verificationString, newUserPassword: passwordData.password },
			InTransactionEnum.ON,
		);
	}

	@ApiOperation({ summary: 'Request an email-change letter on behalf of the SaaS service' })
	@ApiBody({ type: SaasUserIdWithLinkBaseDto })
	@ApiResponse({ status: 201, type: OperationResultMessageWithEmailPayloadDs })
	@Post('user/email/change/request')
	async requestSaasUserEmailChange(
		@Body() body: SaasUserIdWithLinkBaseDto,
	): Promise<OperationResultMessageWithEmailPayloadDs> {
		return await this.requestChangeUserEmailUseCase.execute(
			{
				userId: body.userId,
				verificationLinkBase: body.verificationLinkBase,
				suppressEmail: body.suppressEmail === true,
			},
			InTransactionEnum.ON,
		);
	}

	@ApiOperation({ summary: 'Consume an email-change token on behalf of the SaaS service' })
	@ApiBody({ type: SaasVerifyEmailChangeDto })
	@ApiResponse({ status: 201, type: OperationResultMessageWithEmailPayloadDs })
	@Post('user/email/change/verify/:verificationString')
	async verifySaasUserEmailChange(
		@VerificationString('verificationString') verificationString: string,
		@Body() emailData: SaasVerifyEmailChangeDto,
	): Promise<OperationResultMessageWithEmailPayloadDs> {
		return await this.verifyChangeUserEmailUseCase.execute(
			{ verificationString, newEmail: emailData.email, suppressEmail: emailData.suppressEmail === true },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Invite a user into a company on behalf of the SaaS service' })
	@ApiBody({ type: SaasInviteUserInCompanyDto })
	@ApiResponse({ status: 201, type: InvitedUserInCompanyAndConnectionGroupDs })
	@Post('company/:companyId/invite')
	async inviteSaasUserInCompany(
		@Param('companyId') companyId: string,
		@Body() body: SaasInviteUserInCompanyDto,
	): Promise<InvitedUserInCompanyAndConnectionGroupDs> {
		if (!ValidationHelper.isValidUUID(companyId)) {
			throw new BadRequestException(Messages.COMPANY_ID_MISSING);
		}
		// Authorization (company admin, ownership of inviterId) is enforced by the SaaS caller —
		// this bridge only trusts the microservice JWT, exactly like `saas/user/register`.
		return await this.inviteUserInCompanyUseCase.execute({
			inviterId: body.inviterId,
			companyId,
			groupId: body.groupId ?? null,
			invitedUserEmail: body.email,
			invitedUserCompanyRole: body.role,
			inviteLinkBase: body.inviteLinkBase,
			emailVerificationLinkBase: body.emailVerificationLinkBase,
			suppressEmail: body.suppressEmail === true,
		});
	}

	@ApiOperation({ summary: 'Accept a company invitation on behalf of the SaaS service' })
	@ApiBody({ type: VerifyCompanyInvitationRequestDto })
	@ApiResponse({
		status: 201,
		description: 'Invitation accepted; returns the user identity so the SaaS caller can sign its own cookie.',
		type: AcceptedCompanyInvitationDs,
	})
	@Post('company/invite/verify/:verificationString')
	async verifySaasCompanyInvitation(
		@VerificationString('verificationString') verificationString: string,
		@Body() verificationData: VerifyCompanyInvitationRequestDto,
	): Promise<AcceptedCompanyInvitationDs> {
		ValidationHelper.isPasswordStrongOrThrowError(verificationData.password);
		const inputData: AcceptUserValidationInCompany = {
			verificationString,
			userPassword: verificationData.password,
			userName: verificationData.userName,
		};
		return await this.verifyInviteUserInCompanyUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Validate an end-user JWT on behalf of the SaaS service' })
	@ApiResponse({
		status: 201,
		description: 'Token is valid (signature, logout blacklist, user existence, suspension, 2FA scope).',
		type: ValidatedUserTokenRO,
	})
	@ApiBody({ type: ValidateUserTokenDto })
	@Post('user/validate-token')
	async validateUserToken(@Body() body: ValidateUserTokenDto): Promise<ValidatedUserTokenRO> {
		return await this.validateUserTokenUseCase.execute(
			{ token: body.token, allowScopes: body.allowScopes },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'User logout webhook — blacklist an end-user JWT issued by the SaaS service' })
	@ApiResponse({
		status: 201,
		description: 'Token added to the logout blacklist; every later validation of it fails.',
		type: SuccessResponse,
	})
	@Post('user/logout')
	async usualUserLogout(@Body('token') token: string): Promise<SuccessResponse> {
		if (!token || typeof token !== 'string') {
			throw new BadRequestException(Messages.TOKEN_MISSING);
		}
		const success = await this.logOutUseCase.execute(token, InTransactionEnum.ON);
		return { success };
	}

	@ApiOperation({ summary: 'User login webhook' })
	@ApiResponse({
		status: 200,
		description: 'Credentials verified; user info returned (no token is signed here — the caller signs the cookie).',
		type: FoundUserDto,
	})
	@Post('user/login')
	async usualUserLogin(
		@Body('email') email: string,
		@Body('password') password: string,
		@Body('companyId') companyId: string,
		@Body('request_domain') request_domain: string,
		@Body('ipAddress') ipAddress: string,
		@Body('userAgent') userAgent: string,
	): Promise<FoundUserDto> {
		return await this.usualLoginUserUseCase.execute(
			{ email, password, companyId, request_domain, ipAddress, userAgent, gclidValue: null },
			InTransactionEnum.OFF,
		);
	}

	// ---------------------------------------------------------------------------------------------
	// Account-management bridges (plan 15 Phase 4). `userId` ownership is enforced by the SaaS
	// caller (cookie auth) — these bridges only trust the microservice JWT, like `saas/user/login`.
	// ---------------------------------------------------------------------------------------------

	@ApiOperation({ summary: 'Get the full user profile on behalf of the SaaS service (findMe parity)' })
	@ApiResponse({ status: 200, type: FoundUserDto })
	@Get('user/:userId/profile')
	async getSaasUserProfile(@Param('userId') userId: string): Promise<FoundUserDto> {
		if (!ValidationHelper.isValidUUID(userId)) {
			throw new BadRequestException(Messages.USER_ID_MISSING);
		}
		// findMe passes the GCLID cookie value here; there is no cookie on this internal hop.
		return await this.findUserUseCase.execute({ id: userId, gclidValue: undefined }, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Change a user password on behalf of the SaaS service' })
	@ApiBody({ type: SaasUserPasswordChangeDto })
	@ApiResponse({
		status: 201,
		description:
			'Password changed. The response carries a core-signed token (what the reused use case returns) — ' +
			'the SaaS caller ignores it and re-signs its own cookie, as with the login bridge.',
	})
	@Post('user/password/change')
	async changeSaasUserPassword(@Body() body: SaasUserPasswordChangeDto): Promise<IToken> {
		const inputData: ChangeUsualUserPasswordDs = {
			userId: body.userId,
			email: body.email,
			oldPassword: body.oldPassword,
			newPassword: body.newPassword,
		};
		return await this.changeUsualPasswordUseCase.execute(inputData, InTransactionEnum.ON);
	}

	@ApiOperation({ summary: 'Change a user name on behalf of the SaaS service' })
	@ApiBody({ type: SaasChangeUserNameDto })
	@ApiResponse({ status: 200, type: FoundUserDto })
	@Put('user/name')
	async changeSaasUserName(@Body() body: SaasChangeUserNameDto): Promise<FoundUserDto> {
		return await this.changeUserNameUseCase.execute({ id: body.userId, name: body.name }, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Delete a user account on behalf of the SaaS service' })
	@ApiBody({ type: SaasDeleteUserAccountDto })
	@ApiResponse({ status: 200, type: RegisteredUserDs })
	@Put('user/delete')
	async deleteSaasUserAccount(@Body() body: SaasDeleteUserAccountDto): Promise<Omit<RegisteredUserDs, 'token'>> {
		// When the deleted user is the last one in the company, the use case calls back into the SaaS
		// service (`saasCompanyGatewayService.deleteCompany`) — plain sequential HTTP, no deadlock.
		const deleteResult = await this.deleteUserAccountUseCase.execute(body.userId, InTransactionEnum.ON);
		const slackMessage = Messages.USER_DELETED_ACCOUNT(deleteResult.email, body.reason ?? '', body.message ?? '');
		await slackPostMessage(slackMessage);
		return deleteResult;
	}

	@ApiOperation({ summary: 'Save user session settings on behalf of the SaaS service' })
	@ApiBody({ type: SaasSaveUserSettingsDto })
	@ApiResponse({ status: 201, type: UserSettingsDataRequestDto })
	@Post('user/settings')
	async saveSaasUserSettings(@Body() body: SaasSaveUserSettingsDto): Promise<SaveUserSettingsDs> {
		return await this.saveUserSessionSettingsUseCase.execute(
			{ userId: body.userId, userSettings: body.userSettings },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Get user session settings on behalf of the SaaS service' })
	@ApiResponse({ status: 200, type: UserSettingsDataRequestDto })
	@Get('user/:userId/settings')
	async getSaasUserSettings(@Param('userId') userId: string): Promise<SaveUserSettingsDs> {
		if (!ValidationHelper.isValidUUID(userId)) {
			throw new BadRequestException(Messages.USER_ID_MISSING);
		}
		return await this.getUserSessionSettingsUseCase.execute(userId, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Toggle display mode of test connections on behalf of the SaaS service' })
	@ApiBody({ type: SaasToggleTestConnectionsDto })
	@ApiResponse({ status: 200, type: SuccessResponse })
	@Put('user/test-connections')
	async toggleSaasTestConnectionsDisplayMode(@Body() body: SaasToggleTestConnectionsDto): Promise<SuccessResponse> {
		return await this.toggleTestConnectionsDisplayModeUseCase.execute(
			{ userId: body.userId, displayMode: body.displayMode === 'on' },
			InTransactionEnum.OFF,
		);
	}

	// ---------------------------------------------------------------------------------------------
	// 2FA/OTP bridges (plan 15 Phase 5).
	// ---------------------------------------------------------------------------------------------

	@ApiOperation({ summary: 'Generate an OTP secret and QR code on behalf of the SaaS service' })
	@ApiBody({ type: SaasUserIdDto })
	@ApiResponse({ status: 201, type: OtpSecretDS })
	@Post('user/otp/generate')
	async generateSaasUserOtp(@Body() body: SaasUserIdDto): Promise<OtpSecretDS> {
		return await this.generateOtpUseCase.execute(body.userId, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Verify an OTP code (finish 2FA enrolment) on behalf of the SaaS service' })
	@ApiBody({ type: SaasOtpCodeDto })
	@ApiResponse({ status: 201, type: OtpValidationResultDS })
	@Post('user/otp/verify')
	async verifySaasUserOtp(@Body() body: SaasOtpCodeDto): Promise<OtpValidationResultDS> {
		return await this.verifyOtpUseCase.execute({ userId: body.userId, otpToken: body.otpCode }, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Disable 2FA on behalf of the SaaS service' })
	@ApiBody({ type: SaasOtpCodeDto })
	@ApiResponse({ status: 201, type: OtpDisablingResultDS })
	@Post('user/otp/disable')
	async disableSaasUserOtp(@Body() body: SaasOtpCodeDto): Promise<OtpDisablingResultDS> {
		return await this.disableOtpUseCase.execute({ userId: body.userId, otpToken: body.otpCode }, InTransactionEnum.OFF);
	}

	@ApiOperation({
		summary:
			'Complete a 2FA login on behalf of the SaaS service: validates the temporary token ' +
			'(blacklist + TEMPORARY_JWT_SECRET) and verifies the OTP code.',
	})
	@ApiBody({ type: SaasOtpLoginDto })
	@ApiResponse({
		status: 201,
		description: 'OTP accepted; returns the user identity so the SaaS caller can sign its own full-session cookie.',
		type: FoundUserDto,
	})
	@Post('user/otp/login')
	async saasUserOtpLogin(@Body() body: SaasOtpLoginDto): Promise<FoundUserDto> {
		const inputData: SaasOtpLoginDs = {
			temporaryToken: body.temporaryToken,
			otpCode: body.otpCode,
			ipAddress: body.ipAddress,
			userAgent: body.userAgent,
		};
		return await this.saasOtpLoginUseCase.execute(inputData, InTransactionEnum.OFF);
	}

	@ApiOperation({ summary: 'Get companies where a user with this email is registered' })
	@ApiResponse({
		status: 200,
		description: 'Companies where a user with this email is registered.',
		type: FoundUserEmailCompaniesInfoDs,
		isArray: true,
	})
	@Get('company/my/email/:email')
	async getUserEmailCompanies(@Param('email') email: string): Promise<Array<FoundUserEmailCompaniesInfoDs>> {
		ValidationHelper.validateOrThrowHttpExceptionEmail(email);
		return await this.getUserEmailCompaniesUseCase.execute(email);
	}

	@ApiOperation({ summary: 'Register demo user register webhook' })
	@ApiBody({ type: SaasUsualUserRegisterDS })
	@ApiResponse({
		status: 201,
		description: 'Demo user account has been successfully registered.',
		type: FoundUserDto,
	})
	@Post('user/demo/register')
	async registerDemoUserAccount(
		@Body('email') email: string,
		@Body('gclidValue') gclidValue: string,
		@Body('companyId') companyId: string,
		@Body('companyName') companyName: string,
	): Promise<FoundUserDto> {
		return await this.demoRegisterUserUseCase.execute({ email, gclidValue, companyId, companyName });
	}

	@ApiOperation({ summary: 'Login or create user with google webhook' })
	@ApiBody({ type: SaasRegisterUserWithGoogleDS })
	@ApiResponse({
		status: 201,
	})
	@Post('user/google/login')
	async loginUserWithGoogle(
		@Body('email') email: string,
		@Body('name') name: string,
		@Body('glidCookieValue') glidCookieValue: string,
		@Body('ipAddress') ipAddress: string,
		@Body('userAgent') userAgent: string,
	): Promise<UserEntity> {
		return await this.loginUserWithGoogleUseCase.execute(
			{ email, name, glidCookieValue, ipAddress, userAgent },
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({ summary: 'Login or create user with github webhook' })
	@ApiBody({ type: SaasRegisterUserWithGithub })
	@ApiResponse({
		status: 201,
	})
	@Post('user/github/login')
	async loginUserWithGithub(
		@Body('email') email: string,
		@Body('name') name: string,
		@Body('githubId') githubId: number,
		@Body('glidCookieValue') glidCookieValue: string,
		@Body('ipAddress') ipAddress: string,
		@Body('userAgent') userAgent: string,
	): Promise<UserEntity> {
		return await this.loginUserWithGithubUseCase.execute({
			email,
			name,
			githubId,
			glidCookieValue,
			ipAddress,
			userAgent,
		});
	}

	@ApiOperation({ summary: 'Suspending users' })
	@Put('/company/:companyId/users/suspend')
	async suspendUsers(
		@Body('emailsToSuspend') emailsToSuspend: Array<string>,
		@Body('companyId') companyId: string,
	): Promise<SuccessResponse> {
		await this.suspendUsersUseCase.execute({ emailsToSuspend, companyId });
		return { success: true };
	}

	@ApiOperation({ summary: 'Suspending users' })
	@Put('/company/:companyId/users/suspend-above-limit')
	async suspendUsersOverLimit(@Body('companyId') companyId: string): Promise<SuccessResponse> {
		await this.suspendUsersOverLimitUseCase.execute(companyId);
		return { success: true };
	}

	@ApiOperation({ summary: 'Get company info by user id' })
	@ApiResponse({
		status: 200,
	})
	@Get('/user/:userId/company')
	async getCompanyInfoByUserId(@Param('userId') userId: string): Promise<CompanyInfoEntity> {
		return await this.getCompanyInfoByUserIdUseCase.execute(userId);
	}

	@ApiOperation({ summary: 'Users count in company by company id' })
	@Get('/company/:companyId/users/count')
	async getUsersCountInCompany(@Param('companyId') companyId: string): Promise<{ count: number }> {
		const usersCount = await this.getUsersCountInCompanyByIdUseCase.execute(companyId);
		return { count: usersCount };
	}

	@ApiOperation({ summary: 'Freeze paid connections in companies webhook' })
	@Put('/company/freeze-connections')
	async freezeConnectionsInCompany(@Body('companyIds') companyIds: Array<string>) {
		return await this.freezeConnectionsInCompanyUseCase.execute({ companyIds });
	}

	@ApiOperation({ summary: 'Unfreeze paid connections in companies webhook' })
	@Put('/company/unfreeze-connections')
	async unfreezeConnectionsInCompany(@Body('companyIds') companyIds: Array<string>) {
		return await this.unfreezeConnectionsInCompanyUseCase.execute({ companyIds });
	}

	@ApiOperation({ summary: 'Register user with SAML' })
	@ApiBody({ type: SaasSAMLUserRegisterDS })
	@ApiResponse({
		status: 201,
	})
	@Post('user/saml/login')
	async registerUserWithSaml(
		@Body('email') email: string,
		@Body('name') name: string,
		@Body('companyId') companyId: string,
		@Body('samlConfigId') samlConfigId: string,
		@Body('samlNameId') samlNameId: string,
		@Body('samlAttributes') samlAttributes: Record<string, any>,
	): Promise<UserEntity> {
		return await this.registerUserWithSamlUseCase.execute({
			email,
			name,
			companyId,
			samlConfigId,
			samlNameId,
			samlAttributes,
		});
	}

	@ApiOperation({ summary: 'Created connection of hosted database' })
	@ApiBody({ type: CreateConnectionForHostedDbDto })
	@ApiResponse({
		status: 201,
		type: CreatedConnectionResponse,
	})
	@Post('/connection/hosted')
	async createConnectionForHostedDb(
		@Body() connectionData: CreateConnectionForHostedDbDto,
	): Promise<CreatedConnectionResponse> {
		return await this.createConnectionForHostedDbUseCase.execute(connectionData);
	}

	@ApiOperation({ summary: 'Delete connection of hosted database' })
	@ApiBody({ type: DeleteConnectionForHostedDbDto })
	@ApiResponse({
		status: 201,
		type: CreatedConnectionDTO,
	})
	@Post('/connection/hosted/delete')
	async deleteConnectionForHostedDb(
		@Body() deleteConnectionData: DeleteConnectionForHostedDbDto,
	): Promise<CreatedConnectionDTO> {
		return await this.deleteConnectionForHostedDbUseCase.execute(deleteConnectionData);
	}

	@ApiOperation({ summary: 'Update password of hosted database connection' })
	@ApiBody({ type: UpdateHostedConnectionPasswordDto })
	@ApiResponse({
		status: 201,
		type: SuccessResponse,
	})
	@Post('/connection/hosted/password')
	async updateHostedConnectionPassword(
		@Body() updatePasswordData: UpdateHostedConnectionPasswordDto,
	): Promise<SuccessResponse> {
		return await this.updateHostedConnectionPasswordUseCase.execute(updatePasswordData);
	}

	@ApiOperation({ summary: 'Get connections info by ids' })
	@ApiBody({ type: GetConnectionsInfoByIdsDS })
	@ApiResponse({
		status: 200,
		type: [FoundConnectionInfoRO],
	})
	@Post('/connections/info')
	async getConnectionsInfoByIds(
		@Body() connectionsData: GetConnectionsInfoByIdsDS,
	): Promise<Array<FoundConnectionInfoRO>> {
		return await this.getConnectionsInfoByIdsUseCase.execute(connectionsData);
	}

	@ApiOperation({ summary: 'Get decrypted credentials for a hosted connection' })
	@ApiBody({ type: GetHostedConnectionCredentialsDto })
	@ApiResponse({
		status: 200,
		type: HostedConnectionCredentialsRO,
	})
	@Post('/connection/hosted/credentials')
	async getHostedConnectionCredentials(
		@Body() data: GetHostedConnectionCredentialsDto,
	): Promise<HostedConnectionCredentialsRO> {
		return await this.getHostedConnectionCredentialsUseCase.execute(data);
	}
}
