import {
	Body,
	Controller,
	Get,
	Inject,
	Injectable,
	Post,
	Query,
	Res,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { UseCaseType } from "../../common/data-injection.tokens.js";
import { MasterPassword } from "../../decorators/master-password.decorator.js";
import { QueryTableName } from "../../decorators/query-table-name.decorator.js";
import { SlugUuid } from "../../decorators/slug-uuid.decorator.js";
import { UserId } from "../../decorators/user-id.decorator.js";
import { InTransactionEnum } from "../../enums/in-transaction.enum.js";
import { ConnectionEditGuard } from "../../guards/connection-edit.guard.js";
import { TableReadGuard } from "../../guards/table-read.guard.js";
import { ValidationHelper } from "../../helpers/validators/validation-helper.js";
import { SentryInterceptor } from "../../interceptors/sentry.interceptor.js";
import {
	IAISettingsAndWidgetsCreation,
	IRequestInfoFromTableV2,
} from "./ai-use-cases.interface.js";
import { RequestInfoFromTableDSV2 } from "./application/data-structures/request-info-from-table.ds.js";
import { RequestInfoFromTableBodyDTO } from "./application/dto/request-info-from-table-body.dto.js";

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags("ai v2")
@Injectable()
export class UserAIRequestsControllerV2 {
	constructor(
		@Inject(UseCaseType.REQUEST_INFO_FROM_TABLE_WITH_AI_V2)
		private readonly requestInfoFromTableWithAIUseCase: IRequestInfoFromTableV2,
		@Inject(UseCaseType.REQUEST_AI_SETTINGS_AND_WIDGETS_CREATION)
		private readonly requestAISettingsAndWidgetsCreationUseCase: IAISettingsAndWidgetsCreation,
	) {}

	@ApiOperation({
		summary: "Request info from table in connection with AI (Version 2)",
	})
	@ApiResponse({
		status: 201,
		description: "Returned info.",
	})
	@UseGuards(TableReadGuard)
	@ApiBody({ type: RequestInfoFromTableBodyDTO })
	@ApiQuery({ name: "tableName", required: true, type: String })
	@ApiQuery({ name: "threadId", required: false, type: String })
	@Post("/ai/v2/request/:connectionId")
	public async requestInfoFromTableWithAI(
		@SlugUuid("connectionId") connectionId: string,
		@Query("threadId") threadId: string,
		@QueryTableName() tableName: string,
		@MasterPassword() masterPassword: string,
		@UserId() userId: string,
		@Body() requestData: RequestInfoFromTableBodyDTO,
		@Res({ passthrough: true }) response: Response,
	): Promise<void> {
		if (threadId) {
			if (!ValidationHelper.isValidUUID(threadId)) {
				response
					.status(400)
					.send({
						error: "Invalid threadId format. It should be a valid UUID.",
					});
				return;
			}
		}
		const inputData: RequestInfoFromTableDSV2 = {
			connectionId,
			tableName,
			user_message: requestData.user_message,
			master_password: masterPassword,
			user_id: userId,
			response,
			ai_thread_id: threadId || null,
		};
		return await this.requestInfoFromTableWithAIUseCase.execute(
			inputData,
			InTransactionEnum.OFF,
		);
	}

	@ApiOperation({
		summary: "Request AI settings and widgets creation for connection",
	})
	@ApiResponse({
		status: 200,
		description: "AI settings and widgets creation job has been queued.",
	})
	@UseGuards(ConnectionEditGuard)
	@Get("/ai/v2/setup/:connectionId")
	public async requestAISettingsAndWidgetsCreation(
		@SlugUuid("connectionId") connectionId: string,
		@MasterPassword() masterPassword: string,
		@UserId() userId: string,
	): Promise<void> {
		const connectionData = {
			connectionId,
			masterPwd: masterPassword,
			cognitoUserName: userId,
		};
		return await this.requestAISettingsAndWidgetsCreationUseCase.execute(
			connectionData,
			InTransactionEnum.OFF,
		);
	}
}
