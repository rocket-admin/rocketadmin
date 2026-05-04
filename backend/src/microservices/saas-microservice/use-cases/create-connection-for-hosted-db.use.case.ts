import { Inject, Injectable, InternalServerErrorException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { generateCedarPolicyForGroup } from '../../../entities/cedar-authorization/cedar-policy-generator.js';
import { ConnectionEntity } from '../../../entities/connection/connection.entity.js';
import { readSslCertificate } from '../../../entities/connection/ssl-certificate/read-certificate.js';
import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { slackPostMessage } from '../../../helpers/slack/slack-post-message.js';
import { CreatedConnectionResponse } from '../data-structures/common-responce.ds.js';
import { CreateConnectionForHostedDbDto } from '../data-structures/create-connecttion-for-selfhosted-db.dto.js';
import { ICreateConnectionForHostedDb } from './saas-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateConnectionForHostedDbUseCase
	extends AbstractUseCase<CreateConnectionForHostedDbDto, CreatedConnectionResponse>
	implements ICreateConnectionForHostedDb
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: CreateConnectionForHostedDbDto): Promise<CreatedConnectionResponse> {
		const { companyId, userId, databaseName, hostname, port, username, password, hostedDatabaseId } = inputData;

		const connectionAuthor = await this._dbContext.userRepository.findOneUserById(userId);
		if (!connectionAuthor) {
			throw new InternalServerErrorException(Messages.USER_NOT_FOUND);
		}

		await slackPostMessage(Messages.USER_TRY_CREATE_CONNECTION(connectionAuthor.email, ConnectionTypesEnum.postgres));

		const cert = await readSslCertificate();

		const connectionParams = {
			type: ConnectionTypesEnum.postgres,
			host: hostname,
			port: port,
			username: username,
			password: password,
			database: databaseName,
			schema: null,
			sid: null,
			ssh: false,
			privateSSHKey: null,
			sshHost: null,
			sshPort: null,
			sshUsername: null,
			ssl: true,
			cert: cert,
			azure_encryption: false,
			authSource: null,
			dataCenter: null,
		};

		const dao = getDataAccessObject(connectionParams);
		await dao.testConnect();

		const connection = new ConnectionEntity();
		connection.id = hostedDatabaseId;
		connection.type = ConnectionTypesEnum.postgres;
		connection.host = hostname;
		connection.port = port;
		connection.username = username;
		connection.password = password;
		connection.database = databaseName;
		connection.ssl = true;
		connection.cert = cert;
		connection.ssh = false;
		connection.azure_encryption = false;
		connection.masterEncryption = false;
		connection.author = connectionAuthor;

		const savedConnection = await this._dbContext.connectionRepository.saveNewConnection(connection);

		const createdAdminGroup = await this._dbContext.groupRepository.createdAdminGroupInConnection(
			savedConnection,
			connectionAuthor,
		);
		createdAdminGroup.cedarPolicy = generateCedarPolicyForGroup(savedConnection.id, true, {
			connection: { connectionId: savedConnection.id, accessLevel: AccessLevelEnum.edit },
			group: { groupId: createdAdminGroup.id, accessLevel: AccessLevelEnum.edit },
			tables: [],
		});
		await this._dbContext.groupRepository.saveNewOrUpdatedGroup(createdAdminGroup);
		delete createdAdminGroup.connection;
		await this._dbContext.userRepository.saveUserEntity(connectionAuthor);
		savedConnection.groups = [createdAdminGroup];

		const foundCompany =
			await this._dbContext.companyInfoRepository.findCompanyInfoByCompanyIdWithoutConnections(companyId);
		if (foundCompany) {
			const connectionToUpdate = await this._dbContext.connectionRepository.findOne({
				where: { id: savedConnection.id },
			});
			connectionToUpdate.company = foundCompany;
			await this._dbContext.connectionRepository.saveUpdatedConnection(connectionToUpdate);
		}

		await slackPostMessage(Messages.USER_CREATED_CONNECTION(connectionAuthor.email, ConnectionTypesEnum.postgres));

		return { connectionId: savedConnection.id };
	}
}
