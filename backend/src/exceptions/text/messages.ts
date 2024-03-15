import {
  ConnectionTypeEnum,
  EncryptionAlgorithmEnum,
  LogOperationTypeEnum,
  ProviderTypeEnum,
  QueryOrderingEnum,
  SubscriptionLevelEnum,
  TableActionTypeEnum,
  UserActionEnum,
  WidgetTypeEnum,
} from '../../enums/index.js';
import { toPrettyErrorsMsg } from '../../helpers/index.js';
import { enumToString } from '../../helpers/enum-to-string.js';
import { UserRoleEnum } from '../../entities/user/enums/user-role.enum.js';

export const Messages = {
  ACCOUNT_SUSPENDED:
    'Your account has been suspended. Please reach out to your company administrator for assistance or contact our support team for further help',
  ACCESS_LEVEL_INVALID: 'Access level is invalid',
  AGENT_ID_MISSING: 'Agent id is missing',
  AGENT_NOT_FOUND: 'Agent not found',
  ALREADY_SUBSCRIBED_AT_THIS_LEVEL: `You already have a subscription of this level `,
  AUTHORIZATION_REQUIRED: 'Authorization is required',
  AUTHORIZATION_REJECTED: 'Authorization is rejected',
  BULK_DELETE_FAILED_GET_ROWS: (errorReasonsArray: Array<string>) =>
    `Failed to get rows for bulk delete: ${toPrettyErrorsMsg(errorReasonsArray)}`,
  BULK_DELETE_FAILED_DELETE_ROWS: (errorReasonsArray: Array<string>) =>
    `Failed to delete rows: ${toPrettyErrorsMsg(errorReasonsArray)}`,
  LOGIN_DENIED: 'Login failed. Incorrect email or password. Or you registered with social network providers',
  LOGIN_DENIED_SHOULD_CHOOSE_COMPANY: 'Login failed. You should choose company to login first',
  CANNOT_ADD_AUTOGENERATED_VALUE: 'You cannot add value into autogenerated field',
  CANNOT_CHANGE_ADMIN_GROUP: 'You can not change admin group permissions',
  CANNOT_CREATE_CONNECTION_TO_THIS_HOST: 'You cannot create a connection to this host',
  CANT_CREATE_PERMISSION_TYPE_CONNECTION:
    'You can not create more than one permission of type "Connection" for the same group',
  CANT_CREATE_PERMISSION_TYPE_GROUP: 'You can not create more than one permission of type "Group" for the same group',
  CANT_DELETE_ADMIN_GROUP: 'You can not delete Admin group from connection',
  CANT_DELETE_LAST_USER: 'You can not delete the last user from the Admin group',
  CANT_DELETE_PERMISSION_ADMIN_GROUP: `You can not delete editing permission for Connection from Admin group`,
  CANT_CONNECT_AUTOADMIN_WS: `Connection to autoadmin websocket server failed.`,
  CANT_INSERT_DUPLICATE_KEY: 'You can not insert duplicate Key values into database',
  CANT_LIST_AND_EXCLUDE: (fieldName: string) =>
    `You cannot select the same field ${fieldName ? fieldName : 'names'} to list and exclude`,
  CANT_VIEW_AND_EXCLUDE: (fieldName: string) =>
    `You cannot select the same field ${fieldName ? fieldName : 'names'} to view and exclude`,
  CANT_ORDER_AND_EXCLUDE: `You cannot select the same field names to order and exclude`,
  CANT_READONLY_AND_EXCLUDE: (fieldName: string) =>
    `You cannot select the same field ${fieldName ? fieldName : 'names'} to be readonly and exclude`,
  CANT_EXCLUDE_PRIMARY_KEY: (key: string) => `You cannot exclude primary key ${key}`,
  CANT_DO_TABLE_OPERATION: `This type of operations is prohibited in the table settings`,
  CANT_UPDATE_TABLE_VIEW: `You can't update table view`,
  COGNITO_USERNAME_MISSING: 'Cognito username missing',
  COMPANY_ALREADY_EXISTS: 'Company already exists',
  COMPANY_NOT_EXISTS_IN_CONNECTION: `Connection does not attached to company. Please contact our support team`,
  COMPANY_NOT_FOUND: 'Company not found. Please contact our support team',
  COMPANY_NAME_UPDATE_FAILED_UNHANDLED_ERROR: `Failed to update company name. Please contact our support team.`,
  COMPANY_ID_MISSING: `Company id is missing`,
  COMPANIES_USER_EMAIL_NOT_FOUND: (email: string) => `No companies found for user ${email}`,
  CONNECTION_ID_MISSING: 'Connection id is missing',
  CONNECTION_NOT_CREATED: 'Connection was not successfully created.',
  CONNECTION_NOT_FOUND: 'Connection with specified parameters not found',
  CONNECTION_TEST_FILED: 'Connection test failed. ',
  CONNECTION_TEST_FILED_WITH_ERROR: (message: string) =>
    `Connection test failed with error: ${
      message.toLowerCase().includes('timedout') ? '"Connection timed out"' : `"${message}"`
    }`,
  CONNECTION_TYPE_INVALID: `Unsupported database type. Now we supports ${enumToString(ConnectionTypeEnum)}`,
  CONNECTION_PROPERTIES_INVALID: 'Connection properties are invalid',
  CONNECTION_PROPERTIES_CANT_BE_EMPTY: `Connection properties cannot be empty`,
  CONNECTION_PROPERTIES_NOT_FOUND: `Connection properties not found`,
  CONNECTION_TIMED_OUT: `Connection timed out no further information`,
  CONFIRMATION_EMAIL_SENDING_FAILED: `Email sending timed out. Please try again later. If the problem persists, please contact our support team`,
  CUSTOM_FIELD_ID_MISSING: 'Custom field id is missing',
  CUSTOM_FIELD_NOT_FOUND: 'Custom table field with this parameters not found',
  CUSTOM_FIELD_TEMPLATE_MISSING: 'Custom field template string is missing',
  CUSTOM_FIELD_TEXT_MISSING: 'Custom field text is missing',
  CUSTOM_FIELD_TYPE_INCORRECT: 'Unsupported custom field type',
  CUSTOM_FIELD_TYPE_MISSING: 'Custom field type is missing',
  CSV_EXPORT_FAILED: 'CSV export failed',
  DATABASE_MISSING: 'Database is missing',
  DELETE_ROW_FAILED: 'Row deletion failed',
  DESCRIPTION_MISSING: 'Description is missing',
  DONT_HAVE_PERMISSIONS: 'You do not have permission to perform this operation',
  DONT_HAVE_NON_TEST_CONNECTIONS:
    'You only have test connections. To remove test connections please add your connection first',
  ENCRYPTION_ALGORITHM_INCORRECT: (alg: string) =>
    `Unsupported algorithm type${alg ? ` ${alg}.` : '.'} We supports only ${enumToString(
      EncryptionAlgorithmEnum,
    )} algorithms.`,
  ERROR_MESSAGE: 'Error message: ',
  ERROR_MESSAGE_ORIGINAL: 'Error message from database: ',
  EXCLUDED_OR_NOT_EXISTS: (fieldName: string) =>
    `The field "${fieldName}" does not exists in this table or is excluded.`,
  FAILED_ADD_GROUP_IN_CONNECTION: 'Connection failed to add group in connection.',
  FAILED_ADD_PERMISSION_IN_GROUP: 'Failed to add permission in group.',
  FAILED_TO_ADD_SETUP_INTENT_AND_SUBSCRIPTION: `Failed to add setup intent and create subscription`,
  FAILED_ADD_ROW_IN_TABLE: 'Failed to add row in table.',
  FAILED_ADD_USER_IN_GROUP: 'Failed to receive all user groups.',
  FAILED_CONNECTION_DELETE: 'Connection failed to delete.',
  FAILED_CONNECTION_UPDATE: 'Connection failed to update.',
  FAILED_CREATE_GROUP_IN_CONNECTION: 'Failed to create group in connection.',
  FAILED_TO_CHANGE_USER_NAME_WITH_THIS_PASSWORD: `Failed to change user name. Incorrect password or you registered with social netword`,
  FAILED_DECRYPT_CONNECTION_CREDENTIALS: `Failed to decrypt connection parameters. Most likely the master password is incorrect.`,
  FAILED_DELETE_GROUP: 'Failed to delete group.',
  FAILED_DELETE_GROUP_FROM_CONNECTION: 'Failed to to delete group from connection.',
  FAILED_DELETE_USER_ACCOUNT_IN_SAAS: `Failed to delete user account. Please contact our support team.`,
  FAILED_UPDATE_USER_EMAIL_IN_SAAS: `Failed to update user email. Please contact our support team.`,
  FAILED_ESTABLISH_SSH_CONNECTION: `Failed to establish ssh connection`,
  FAILED_FIND_USERS_IN_GROUP: 'Failed to receive users in this group.',
  FAILED_GET_ALL_GROUPS: 'Failed to receive all user groups.',
  FAILED_GET_CONNECTION_ID: 'Failed to get connection ID.',
  FAILED_GET_GROUP_PERMISSIONS: 'Failed to get permissions in group.',
  FAILED_GET_GROUPS: 'Failed to receive groups of this connection.',
  FAILED_GET_TABLE_ROWS: 'Failed to get tables rows.',
  FAILED_GET_TABLE_STRUCTURE: 'Failed to get table structure.',
  FAILED_GET_TABLES: 'Failed to get tables in connection.',
  FAILED_REMOVE_PERMISSION_FROM_GROUP: 'Failed to remove permission from group.',
  FAILED_REMOVE_USER_FROM_COMPANY: 'Failed to remove user from company.',
  FAILED_REMOVE_USER_FROM_GROUP: 'Failed to remove user from group.',
  FAILED_TABLE_SETTINGS_DELETE: 'Failed to delete table settings. ',
  FAILED_TO_GET_TABLE_SCHEMA: (tableName: string) => `Table schema of table ${tableName} not found.`,
  FAILED_TO_SEND_INVITATION_EMAIL: (email: string) => `Failed to send invitation email on address ${email}`,
  FAILED_TO_SEND_CONFIRMATION_EMAIL: (email: string) => `Failed to send confirmation email on address ${email}`,
  FAILED_LOGOUT: `Failed to log out`,
  FAILED_UPDATE_MASTER_PASSWORD: `Failed update master password`,
  FAILED_UPDATE_TABLE_SETTINGS: 'Failed to update table settings. ',
  FIELD_MUST_BE_SORTABLE: (fieldName: string) =>
    `The field "${fieldName}" must be included in sortable fields in table settings`,
  GROUP_NAME_UNIQUE: 'Group title must be unique',
  GROUP_NOT_FOUND: 'Group with specified parameters not found',
  GROUP_NOT_FROM_THIS_CONNECTION: 'This group does not belong to this connection',
  GROUP_ID_MISSING: `Group id is missing`,
  GROUP_TITLE_MISSING: `Group title missing`,
  GOOGLE_LOGIN_FAILED:
    'Google login failed. Please try again later. If the problem persists, please contact our support team',
  GITHUB_AUTHENTICATION_FAILED: `GitHub authentication failed. Please try again later. If the problem persists, please contact our support team`,
  GITHUB_REGISTRATION_FAILED: `Registration with github failed. Please try again later. If the problem persists, please contact our support team`,
  HOST_MISSING: 'Host is missing',
  HOST_NAME_INVALID: 'Hostname is invalid',
  ID_MISSING: 'Id is missing',
  INCORRECT_DATE_FORMAT: `Date format is incorrect.`,
  INCORRECT_TABLE_LOG_ACTION_TYPE: `Incorrect log operation type, supported types are ${enumToString(
    LogOperationTypeEnum,
  )}`,
  INVALID_USERNAME_OR_PASSWORD: `Username or password is invalid`,
  INVALID_USER_COMPANY_ROLE: `Invalid user role in company. Only supported is ${enumToString(UserRoleEnum)}`,
  INVALID_JWT_TOKEN: `JWT token syntax is invalid`,
  LIST_PER_PAGE_INCORRECT: `You can't display less than one row per page`,
  MASTED_NEW_PASSWORD_MISSING: `New master password is missing.`,
  MASTED_OLD_PASSWORD_MISSING: `Old master password is missing.`,
  MASTER_PASSWORD_MISSING: `Master password is missing.`,
  MASTER_PASSWORD_REQUIRED: `A master password is required if you want to apply additional encryption.`,
  MUST_BE_ARRAY: (fieldName: string) => `The field "${fieldName}" must be an array`,
  MUST_CONTAIN_ARRAY_OF_PRIMARY_KEYS: `Body must contain array of primary keys`,
  NO_SUCH_FIELDS_IN_TABLES: (fields: Array<string>, tableName: string) =>
    `There are no such fields: ${fields.join(', ')} - in the table "${tableName}"`,
  NO_SUCH_FIELD_IN_TABLE: (fieldName: string, tableName: string) =>
    `There is no such field: "${fieldName}" in the table "${tableName}"`,
  ORDERING_FIELD_INCORRECT: `Value of sorting order is incorrect. You can choose from values ${enumToString(
    QueryOrderingEnum,
  )}`,
  OTP_NOT_ENABLED: `OTP is not enabled`,
  OTP_VALIDATION_FAILED: `OTP validation failed`,
  OTP_DISABLING_FAILED: `OTP disabling failed`,
  DISABLING_2FA_FORBIDDEN_BY_ADMIN: `Disabling 2fa is forbidden by company administrator`,
  PAGE_AND_PERPAGE_INVALID: `Parameters "page" and "perPage" must be more than zero`,
  PARAMETER_MISSING: 'Required parameter missing',
  PARAMETER_NAME_MISSING: (parameterName: string) => `Required parameter "${parameterName}" missing`,
  PASSWORD_MISSING: 'Password is missing',
  PASSWORD_WEAK: 'Password is too weak',
  PASSWORD_OLD_MISSING: 'Old password is missing',
  PASSWORD_NEW_MISSING: 'New password is missing',
  PASSWORD_OLD_INVALID: 'Old password is invalid',
  PASSWORD_RESET_REQUESTED_SUCCESSFULLY: `Password reset requested successfully`,
  PASSWORD_RESET_REQUESTED: `Password reset requested`,
  PASSWORD_RESET_VERIFICATION_FAILED: `Password reset verification failed. Link is incorrect.`,
  PERMISSION_NOT_FOUND: 'Permission not found',
  PERMISSION_TYPE_INVALID: 'Permission type is invalid',
  PERMISSIONS_MISSING: 'Permissions missing',
  PORT_FORMAT_INCORRECT: 'Port value must be a number',
  PORT_MISSING: 'Port value is invalid',
  PRIMARY_KEY_INVALID: 'Primary key is incorrect. Please check all its parameters',
  PRIMARY_KEY_MISSING: 'Primary key is missing',
  PRIMARY_KEY_MISSING_PARAMETER_OR_INCORRECT: 'Primary key missing parameter or is incorrect',
  PRIMARY_KEY_NAME_MISSING: 'Primary key name is missing',
  PRIMARY_KEY_NOT_EXIST: 'This type of primary key does not exists in this table',
  PRIMARY_KEY_VALUE_MISSING: 'Primary key value is missing',
  RECEIVING_ROW_FAILED: 'Row receiving failed',
  RECEIVING_USER_CONNECTIONS_FAILED: 'Receiving user connections failed.',
  RECEIVING_USER_PERMISSIONS_FAILED: 'Receiving user permissions failed.',
  REQUIRED_FIELD_CANT_BE_EMPTY: 'Required field can not be empty',
  REQUIRED_PARAMETERS_MISSING: (paramsNames: Array<string>): string =>
    `Required parameter${paramsNames.length > 1 ? 's' : ''} ${paramsNames.join(', ')} ${
      paramsNames.length > 1 ? 'are' : 'is'
    } missing`,
  ROW_PRIMARY_KEY_NOT_FOUND: 'Row with this primary key not found',
  SAAS_COMPANY_NOT_REGISTERED_WITH_USER_INVITATION: `Failed to invite user in SaaS. Please contact our support team.`,
  SAAS_UPDATE_USERS_ROLES_FAILED_UNHANDLED_ERROR: `Failed to update users roles in SaaS. Please contact our support team.`,
  SAAS_DELETE_COMPANY_FAILED_UNHANDLED_ERROR: `Failed to delete company in SaaS. Please contact our support team.`,
  SAAS_UPDATE_2FA_STATUS_FAILED_UNHANDLED_ERROR: `Failed to update 2fa status in SaaS. Please contact our support team.`,
  SOMETHING_WENT_WRONG_ROW_ADD: 'Something went wrong on row insertion, check inserted parameters and try again',
  SSH_FORMAT_INCORRECT: 'Ssh value must be a boolean',
  SSH_HOST_MISSING: 'Ssh host is missing',
  SSH_PORT_MISSING: 'Ssh port is missing',
  SSH_PORT_FORMAT_INCORRECT: 'Ssh port value must be a number',
  SSH_USERNAME_MISSING: 'Ssh username is missing',
  SSH_PASSWORD_MISSING: 'Ssh private key is missing',
  TABLE_ACTION_TYPE_INCORRECT: `Incorrect table action. Now we supports types: ${enumToString(TableActionTypeEnum)}`,
  TABLE_ID_MISSING: 'Table id is missing',
  TABLE_LOGS_NOT_FOUND: `Unable to find logs for this table`,
  TABLE_NAME_MISSING: 'Table name missing.',
  TABLE_NAME_REQUIRED: 'Table name is required for permission type "Table"',
  TABLE_NOT_EXISTS: 'A table with this name does not exist in the connection',
  TABLE_WITH_NAME_NOT_EXISTS: (tableName: string) => `A table ${tableName} does not exist in the connection`,
  TABLE_NOT_FOUND: 'Table not found',
  TABLE_SCHEMA_NOT_FOUND: (tableName: string) =>
    `Table schema for table ${tableName} not found or this table does not exists`,
  TABLE_SETTINGS_NOT_FOUND: 'Table settings with this parameters not found',
  TABLE_WIDGET_NOT_FOUND: 'Table widget with this parameters not found',
  TABLE_ACTION_NOT_FOUND: 'Table action not found',
  TABLE_ACTION_CONFIRMATION_REQUIRED: 'Table action confirmation required',
  TEST_CONNECTIONS_UPDATE_NOT_ALLOWED: `You can't update test connection`,
  TRY_AGAIN_LATER: 'Please try again later. If the problem persists, please contact our support team',
  TRY_VERIFY_ADD_USER_WHEN_LOGGED_IN: `You can't join a group when you are logged in as another user. Please log out and try again.`,
  TYPE_MISSING: 'Type is missing',
  TOKEN_MISSING: 'Token is missing',
  TWO_FA_REQUIRED: `Two factor authentication required in this company according to company settings. Please enable 2fa in your profile settings.`,
  UNABLE_FIND_PORT: `Unable to find a free port. Please try again later. If the problem persists, please contact our support team`,
  UPDATE_ROW_FAILED: 'Row updating failed',
  USER_ALREADY_ADDED: 'User has already been added in this group',
  USER_ALREADY_ADDED_IN_COMPANY: 'User has already been added in this company',
  USER_ALREADY_ADDED_IN_COMPANY_BUT_NOT_ACTIVE:
    'User has already been added in this company, but email is not confirmed. We sent new invitation on this users email.',
  USER_ALREADY_ADDED_BUT_NOT_ACTIVE:
    'User already added in this group, but email is not confirmed. We sent new invitation on this users email.',
  USER_ALREADY_ADDED_BUT_NOT_ACTIVE_IN_COMPANY:
    'User already added in this company, but email is not confirmed. We sent new invitation on this users email.',
  USER_CREATE_CONNECTION: (email: string, connectionType: any) =>
    `Connection of type "${connectionType}" was added by user "${email}".`,
  USER_CREATED: (email: string, provider: ProviderTypeEnum = null) =>
    `User "${email}" was registered. ${provider ? `Provider: "${provider}".` : ''}`,
  USER_CREATION_FAILED: 'Creating a new user failed.',
  USER_DELETED_ACCOUNT: (email: string, reason: string, message: string) =>
    `User ${email ? email : 'unknowm'} deleted their account. Reason is: ${
      reason ? reason : 'unknown'
    }. And message is: ${message ? message : 'no message'}.`,
  USER_DELETED_CONNECTION: (email: string, reason: string, message: string) =>
    `User ${email ? email : 'unknowm'} deleted their own connection. Reason is: ${
      reason ? reason : 'unknown'
    }. And message is: ${message ? message : 'no message'}.`,
  USER_EMAIL_MISSING: `User email is missing`,
  USER_MISSING_EMAIL_OR_SOCIAL_REGISTERED: `User with this email not found in our database. Please check your email.
  Hint: if you registered through google or facebook, you need to change your password in these providers`,
  UUID_INVALID: `Invalid id syntax`,
  VERIFICATION_LINK_INCORRECT: 'Verification link is incorrect',
  VERIFICATION_LINK_EXPIRED: 'Verification link expired',
  VERIFICATION_STRING_INCORRECT: 'Verification string format is incorrect',
  EMAIL_ALREADY_CONFIRMED: 'Email is already confirmed',
  EMAIL_MISSING: 'Email is missing',
  EMAIL_INVALID: 'Email is invalid',
  EMAIL_SYNTAX_INVALID: 'Email syntax is invalid',
  EMAIL_NOT_CONFIRMED: 'Email is not confirmed',
  EMAIL_VERIFICATION_FAILED: 'Email verification failed',
  EMAIL_VERIFIED_SUCCESSFULLY: 'Email verified successfully',
  EMAIL_CHANGE_REQUESTED_SUCCESSFULLY: `Email change request was requested successfully`,
  EMAIL_CHANGE_REQUESTED: `Email change request was requested`,
  EMAIL_CHANGE_FAILED: `Email change request failed. Incorrect link`,
  EMAIL_CHANGED: 'Email changed',
  EMAIL_VERIFICATION_REQUESTED: 'Email verification requested',
  USER_EMAIL_NOT_FOUND: (email: string) =>
    `User ${email} is not found in our system, please ask the user to create an account first`,
  USER_EMAIL_NOT_FOUND_AND_INVITED: (email: string) =>
    `User ${email} is not found in our system. We have sent an invitation to the user's email. Please ask the user to log in.`,
  USER_INVITE_EXTERNAL_USER: (userAddEmail: string, userToAddEmail: string) =>
    `User ${userAddEmail} send invite to external user ${userToAddEmail}.`,
  USER_ADDED_IN_GROUP: (email: string) => `User ${email} was added in group successfully`,
  USER_ALREADY_REGISTERED: (email: string) => `User with email ${email} is already registered`,
  USER_NOT_FOUND: 'User with specified parameters not found',
  USER_NOT_INVITED_IN_COMPANY: (email: string) =>
    `User ${email} is not invited in company. Invite user in company first`,
  USER_ID_MISSING: 'User id is missing',
  USER_TRY_CREATE_CONNECTION: (email: string) => `User "${email}" tried to create connection.`,
  USER_CREATED_CONNECTION: (email: string) => `User "${email}" created connection.`,
  USER_SUCCESSFULLY_TESTED_CONNECTION: (userEmail: string, connectionType: ConnectionTypeEnum) =>
    `User "${userEmail}" successfully tested the "${connectionType}" connection.`,
  USERNAME_MISSING: 'Username is missing',
  USER_ACTION_INCORRECT: `User action message if incorrect. Supported actions are ${enumToString(UserActionEnum)}`,
  USER_NOT_ACTIVE: 'User is not active. Please confirm your email address.',
  WIDGET_FIELD_NAME_MISSING: 'Missing property "Field name" for widget',
  WIDGET_ID_MISSING: 'Widget id is missing',
  WIDGET_NOT_FOUND: 'Widget with this parameters not found',
  WIDGET_TYPE_INCORRECT: `Table widget type is incorrect. Now we supports types: ${enumToString(WidgetTypeEnum)}`,
  WIDGETS_PROPERTY_MISSING: 'Widgets missing or are incorrect',
  WIDGET_PARAMETER_UNSUPPORTED: (paramName: string, widgetType: WidgetTypeEnum) =>
    `Unsupported parameter "${paramName}" for widget type "${widgetType}"`,
  WIDGET_REQUIRED_PARAMETER_MISSING: (param: string) =>
    `Required widget parameter${param ? ` "${param}" ` : ' '}missing`,
  HIDDEN_TABLES_MUST_BE_ARRAY: `Hidden tables must be array`,
  SUBSCRIPTION_SUCCESSFULLY_CREATED: `Subscription created successfully`,
  SUBSCRIPTION_CANCELLED: `Subscription cancelled`,
  SUBSCRIPTION_TYPE_INCORRECT: () =>
    `Subscription type is incorrect. Now we support subscriptions: ${enumToString(SubscriptionLevelEnum)}`,
  MAXIMUM_INVITATIONS_COUNT_REACHED: 'Sorry, the maximum number of invitations has been reached. Try again later.',
  MAXIMUM_FREE_INVITATION_REACHED: 'Sorry, reached maximum number of users for free plan',
  MAXIMUM_FREE_INVITATION_REACHED_CANNOT_BE_INVITED:
    'Sorry you can not join this group because reached maximum number of users for free plan. Please ask you connection owner to upgrade plan or delete unnecessary user from group',
  MAXIMUM_FREE_INVITATION_REACHED_CANNOT_BE_INVITED_IN_COMPANY:
    'Sorry you can not join this company because reached maximum number of users for free plan. Please ask you connection owner to upgrade plan or delete unused user accounts from company',
  MAXIMUM_INVITATIONS_COUNT_REACHED_CANT_INVITE: ` Sorry, the maximum number of of users for free plan has been reached. You can't invite more users. Please ask you connection owner to upgrade plan or delete unused user accounts from company, or revoke unaccepted invitations.`,
  FAILED_CREATE_SUBSCRIPTION_LOG: 'Failed to create subscription log. Please contact our support team.',
  FAILED_CREATE_SUBSCRIPTION_LOG_YOUR_CUSTOMER_IS_DELETED: `Failed to create subscription log. Your customer is deleted. Please contact our support team.`,
  URL_INVALID: `Url is invalid`,
  FAILED_REMOVE_USER_SAAS_UNHANDLED_ERROR: `Failed to remove user from company. Please contact our support team.`,
  FILED_REVOKE_USER_INVITATION_UNHANDLED_ERROR: `Failed to revoke user invitation. Please contact our support team.`,
  FAILED_ACCEPT_INVITATION_SAAS_UNHANDLED_ERROR: `Failed to accept user invitation. Failed process webhook. Please contact our support team.`,
  NOTHING_TO_REVOKE: `Nothing to revoke`,
  NO_USERS_FOUND_TO_UPDATE_ROLES: `No users found to update roles`,
  USER_ROLES_UPDATE_FAILED: `Failed to update user roles`,
};
