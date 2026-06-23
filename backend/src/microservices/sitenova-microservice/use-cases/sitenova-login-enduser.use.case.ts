import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { buildCommonTableSettingsInput } from '../../../entities/table/utils/build-common-table-settings-input.util.js';
import { parseFilteringFieldsFromBodyData } from '../../../entities/table/utils/find-filtering-fields.util.js';
import { getUserEmailForAgent, validateConnection } from '../../../entities/table/utils/validate-connection.util.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { SitenovaEndUserAuthResultDs, SitenovaLoginEndUserDs } from '../data-structures/sitenova-site.ds.js';
import { SitenovaEndUserAuthService } from '../services/sitenova-enduser-auth.service.js';
import { ISitenovaLoginEndUser } from './sitenova-site-use-cases.interface.js';

@Injectable()
export class SitenovaLoginEndUserUseCase
	extends AbstractUseCase<SitenovaLoginEndUserDs, SitenovaEndUserAuthResultDs>
	implements ISitenovaLoginEndUser
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly endUserAuthService: SitenovaEndUserAuthService,
	) {
		super();
	}

	protected async implementation(inputData: SitenovaLoginEndUserDs): Promise<SitenovaEndUserAuthResultDs> {
		const { connectionId, tableName, email, password, emailField, passwordField } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, '');
		validateConnection(connection);
		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, '', this._dbContext.userRepository);

		const tableStructure = await dao.getTableStructure(tableName, userEmail);

		// Direct, parameterized DAO read (NOT the public column-filtered path) so the hashed password
		// column is available to verify against. The hash is never returned to the caller.
		const filteringFields = parseFilteringFieldsFromBodyData({ [emailField]: { eq: email } }, tableStructure);
		const settings = buildDAOsTableSettingsDs(buildCommonTableSettingsInput(null), null);
		const found = await dao.getRowsFromTable(
			tableName,
			settings,
			1,
			1,
			'',
			filteringFields,
			{ fields: [], value: '' },
			tableStructure,
			userEmail,
		);
		const row = found.data && found.data.length > 0 ? found.data[0] : null;

		// Generic failure for both "no such user" and "wrong password" — never leak which.
		const valid = row ? await Encryptor.verifyUserPassword(password, row[passwordField] as string) : false;
		if (!row || !valid) {
			throw new UnauthorizedException('Invalid email or password.');
		}

		const token = await this.endUserAuthService.signEndUserToken(connectionId, email);
		const user: Record<string, unknown> = { ...row };
		delete user[passwordField];
		return { token, user };
	}
}
