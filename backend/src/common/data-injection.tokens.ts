export enum BaseType {
  GLOBAL_DB_CONTEXT = 'GLOBAL_DB_CONTEXT',
  DATA_SOURCE = 'DATA_SOURCE',
  NUNJUCKS = 'NUNJUCKS',
  REPO_ACCESSOR = 'REPO_ACCESSOR',
}

export enum UseCaseType {
  CREATE_USER = 'CREATE_USER',
  DELETE_USER_ACCOUNT = 'DELETE_USER_ACCOUNT',
  FIND_USER = 'FIND_USER',
  USUAL_LOGIN = 'USUAL_LOGIN',
  USUAL_REGISTER = 'USUAL_REGISTER',
  LOG_OUT = 'LOG_OUT',
  GOOGLE_LOGIN = 'GOOGLE_LOGIN',
  FACEBOOK_LOGIN = 'FACEBOOK_LOGIN',
  CHANGE_USUAL_PASSWORD = 'CHANGE_USUAL_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_RESET_USER_PASSWORD = 'VERIFY_RESET_USER_PASSWORD',
  REQUEST_RESET_USER_PASSWORD = 'REQUEST_RESET_USER_PASSWORD',
  REQUEST_CHANGE_USER_EMAIL = 'REQUEST_CHANGE_USER_EMAIL',
  VERIFY_EMAIL_CHANGE = 'VERIFY_EMAIL_CHANGE',
  VERIFY_EMAIL_REQUEST = 'VERIFY_EMAIL_REQUEST',
  CHANGE_USER_NAME = 'CHANGE_USER_NAME',
  GENERATE_OTP = 'GENERATE_OTP',
  VERIFY_OTP = 'VERIFY_OTP',
  OTP_LOGIN = 'OTP_LOGIN',
  DISABLE_OTP = 'DISABLE_OTP',
  GET_GITHUB_LOGIN_LINK = 'GET_GITHUB_LOGIN_LINK',
  AUTHENTICATE_WITH_GITHUB = 'AUTHENTICATE_WITH_GITHUB',
  SAVE_USER_SESSION_SETTINGS = 'SAVE_USER_SESSION_SETTINGS',
  GET_USER_SESSION_SETTINGS = 'GET_USER_SESSION_SETTINGS',
  TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE = 'TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE',

  FIND_CONNECTIONS = 'FIND_CONNECTIONS',
  FIND_USERS_IN_CONNECTION = 'FIND_USERS_IN_CONNECTION',
  FIND_CONNECTION = 'FIND_CONNECTION',
  CREATE_CONNECTION = 'CREATE_CONNECTION',
  UPDATE_CONNECTION = 'UPDATE_CONNECTION',
  DELETE_CONNECTION = 'DELETE_CONNECTION',
  DELETE_GROUP_FROM_CONNECTION = 'DELETE_GROUP_FROM_CONNECTION',
  CREATE_GROUP_IN_CONNECTION = 'CREATE_GROUP_IN_CONNECTION',
  GET_USER_GROUPS_IN_CONNECTION = 'GET_USER_GROUPS_IN_CONNECTION',
  GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION = 'GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION',
  GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION = 'GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION',
  TEST_CONNECTION_USE_CASE = 'TEST_CONNECTION_USE_CASE',
  UPDATE_CONNECTION_MASTER_PASSWORD = 'UPDATE_CONNECTION_MASTER_PASSWORD',
  RESTORE_CONNECTION = 'RESTORE_CONNECTION',
  VALIDATE_CONNECTION_TOKEN = 'VALIDATE_CONNECTION_TOKEN',
  REFRESH_CONNECTION_AGENT_TOKEN = 'REFRESH_CONNECTION_AGENT_TOKEN',
  VALIDATE_CONNECTION_MASTER_PASSWORD = 'VALIDATE_CONNECTION_MASTER_PASSWORD',
  UNFREEZE_CONNECTION = 'UNFREEZE_CONNECTION',

  FIND_ALL_USER_GROUPS = 'FIND_ALL_USER_GROUPS',
  INVITE_USER_IN_GROUP = 'INVITE_USER_IN_GROUP',
  VERIFY_INVITE_USER_IN_GROUP = 'VERIFY_INVITE_USER_IN_GROUP',
  FIND_ALL_USERS_IN_GROUP = 'FIND_ALL_USERS_IN_GROUP',
  REMOVE_USER_FROM_GROUP = 'REMOVE_USER_FROM_GROUP',
  DELETE_GROUP = 'DELETE_GROUP',
  UPDATE_GROUP_TITLE = 'UPDATE_GROUP_TITLE',

  FIND_CONNECTION_PROPERTIES = 'FIND_CONNECTION_PROPERTIES',
  CREATE_CONNECTION_PROPERTIES = 'CREATE_CONNECTION_PROPERTIES',
  UPDATE_CONNECTION_PROPERTIES = 'UPDATE_CONNECTION_PROPERTIES',
  DELETE_CONNECTION_PROPERTIES = 'DELETE_CONNECTION_PROPERTIES',

  GET_CONVERSIONS = 'GET_CONVERSIONS',

  GET_CUSTOM_FIELDS = 'GET_CUSTOM_FIELDS',
  CREATE_CUSTOM_FIELDS = 'CREATE_CUSTOM_FIELDS',
  UPDATE_CUSTOM_FIELDS = 'UPDATE_CUSTOM_FIELDS',
  DELETE_CUSTOM_FIELD = 'DELETE_CUSTOM_FIELD',

  CREATE_OR_UPDATE_PERMISSIONS = 'CREATE_OR_UPDATE_PERMISSIONS',

  FIND_LOGS = 'FIND_LOGS',
  EXPORT_LOGS_AS_CSV = 'EXPORT_LOGS_AS_CSV',

  FIND_TABLE_SETTINGS = 'FIND_TABLE_SETTINGS',
  CREATE_TABLE_SETTINGS = 'CREATE_TABLE_SETTINGS',
  UPDATE_TABLE_SETTINGS = 'UPDATE_TABLE_SETTINGS',
  DELETE_TABLE_SETTINGS = 'DELETE_TABLE_SETTINGS',

  GET_HELLO = 'GET_HELLO',

  CREATE_USER_ACTION = 'CREATE_USER_ACTION',

  CHECK_USER_LOGS_AND_UPDATE_ACTIONS = 'CHECK_USER_LOGS_AND_UPDATE_ACTIONS',
  CHECK_USER_ACTIONS_AND_MAIL_USERS = 'CHECK_USER_ACTIONS_AND_MAIL_USERS',

  FIND_TABLE_WIDGETS = 'FIND_TABLE_WIDGETS',
  CREATE_UPDATE_DELETE_TABLE_WIDGETS = 'CREATE_UPDATE_DELETE_TABLE_WIDGETS',

  FIND_TABLES_IN_CONNECTION = 'FIND_TABLES_IN_CONNECTION',
  GET_ALL_TABLE_ROWS = 'GET_ALL_TABLE_ROWS',
  GET_TABLE_STRUCTURE = 'GET_TABLE_STRUCTURE',
  ADD_ROW_IN_TABLE = 'ADD_ROW_IN_TABLE',
  UPDATE_ROW_IN_TABLE = 'UPDATE_ROW_IN_TABLE',
  BULK_UPDATE_ROWS_IN_TABLE = 'BULK_UPDATE_ROWS_IN_TABLE',
  DELETE_ROW_FROM_TABLE = 'DELETE_ROW_FROM_TABLE',
  DELETE_ROWS_FROM_TABLE = 'DELETE_ROWS_FROM_TABLE',
  GET_ROW_BY_PRIMARY_KEY = 'GET_ROW_BY_PRIMARY_KEY',
  EXPORT_CSV_FROM_TABLE = 'EXPORT_CSV_FROM_TABLE',
  IMPORT_CSV_TO_TABLE = 'IMPORT_CSV_TO_TABLE',

  CREATE_TABLE_ACTION = 'CREATE_TABLE_ACTION',
  FIND_TABLE_ACTIONS = 'FIND_TABLE_ACTIONS',
  ACTIVATE_TABLE_ACTION = 'ACTIVATE_TABLE_ACTION',
  ACTIVATE_TABLE_ACTIONS = 'ACTIVATE_TABLE_ACTIONS',
  UPDATE_TABLE_ACTION = 'UPDATE_TABLE_ACTION',
  DELETE_TABLE_ACTION = 'DELETE_TABLE_ACTION',
  FIND_TABLE_ACTION = 'FIND_TABLE_ACTION',

  CREATE_TABLE_ACTION_V2 = 'CREATE_TABLE_ACTION_V2',
  GET_TABLE_ACTION_V2 = 'GET_TABLE_ACTION_V2',
  UPDATE_TABLE_ACTION_V2 = 'UPDATE_TABLE_ACTION_V2',

  SAAS_COMPANY_REGISTRATION = 'SAAS_COMPANY_REGISTRATION',
  SAAS_GET_USER_INFO = 'SAAS_GET_USER_INFO',
  SAAS_GET_USER_INFO_BY_EMAIL = 'SAAS_GET_USER_INFO_BY_EMAIL',
  SAAS_USUAL_REGISTER_USER = 'SAAS_USUAL_REGISTER_USER',
  SAAS_LOGIN_USER_WITH_GOOGLE = 'SAAS_LOGIN_USER_WITH_GOOGLE',
  SAAS_GET_USER_INFO_BY_GITHUBID = 'SAAS_GET_USER_INFO_BY_GITHUBID',
  SAAS_LOGIN_USER_WITH_GITHUB = 'SAAS_LOGIN_USER_WITH_GITHUB',
  SAAS_ADD_COMPANY_ID_TO_USER = 'SAAS_ADD_COMPANY_ID_TO_USER',
  SAAS_REMOVE_COMPANY_ID_FROM_USER = 'SAAS_REMOVE_COMPANY_ID_FROM_USER',
  SAAS_REGISTER_INVITED_USER = 'SAAS_REGISTER_INVITED_USER',
  SAAS_SAAS_GET_USERS_INFOS_BY_EMAIL = 'SAAS_SAAS_GET_USERS_INFOS_BY_EMAIL',
  SAAS_SUSPEND_USERS = 'SAAS_SUSPEND_USERS',
  SAAS_GET_COMPANY_INFO_BY_USER_ID = 'SAAS_GET_COMPANY_INFO_BY_USER_ID',
  SAAS_GET_USERS_IN_COMPANY_BY_ID = 'SAAS_GET_USERS_IN_COMPANY_BY_ID',
  FREEZE_CONNECTIONS_IN_COMPANY = 'FREEZE_CONNECTIONS_IN_COMPANY',
  UNFREEZE_CONNECTIONS_IN_COMPANY = 'UNFREEZE_CONNECTIONS_IN_COMPANY',

  INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP = 'INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP',
  VERIFY_INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP = 'VERIFY_INVITE_USER_IN_COMPANY_AND_CONNECTION_GROUP',
  CHECK_IS_VERIFICATION_LINK_AVAILABLE = 'CHECK_IS_VERIFICATION_LINK_AVAILABLE',
  UPDATE_USERS_2FA_STATUS_IN_COMPANY = 'UPDATE_USERS_2FA_STATUS_IN_COMPANY',

  GET_USER_COMPANY = 'GET_USER_COMPANY',
  GET_FULL_USER_COMPANIES_INFO = 'GET_FULL_USER_COMPANIES_INFO',
  GET_USER_EMAIL_COMPANIES = 'GET_USER_EMAIL_COMPANIES',
  GET_USERS_IN_COMPANY = 'GET_USERS_IN_COMPANY',
  GET_COMPANY_NAME = 'GET_COMPANY_NAME',
  REMOVE_USER_FROM_COMPANY = 'REMOVE_USER_FROM_COMPANY',
  REVOKE_INVITATION_IN_COMPANY = 'REVOKE_INVITATION_IN_COMPANY',
  UPDATE_COMPANY_NAME = 'UPDATE_COMPANY_NAME',
  UPDATE_USERS_COMPANY_ROLES = 'UPDATE_USERS_COMPANY_ROLES',
  DELETE_COMPANY = 'DELETE_COMPANY',
  SUSPEND_USERS_IN_COMPANY = 'SUSPEND_USERS_IN_COMPANY',
  UNSUSPEND_USERS_IN_COMPANY = 'UNSUSPEND_USERS_IN_COMPANY',
  TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE_IN_COMPANY = 'TOGGLE_TEST_CONNECTIONS_DISPLAY_MODE_IN_COMPANY',
  UPLOAD_COMPANY_LOGO = 'UPLOAD_COMPANY_LOGO',
  FIND_COMPANY_LOGO = 'FIND_COMPANY_LOGO',
  DELETE_COMPANY_LOGO = 'DELETE_COMPANY_LOGO',
  UPLOAD_COMPANY_FAVICON = 'UPLOAD_COMPANY_FAVICON',
  FIND_COMPANY_FAVICON = 'FIND_COMPANY_FAVICON',
  DELETE_COMPANY_FAVICON = 'DELETE_COMPANY_FAVICON',
  ADD_COMPANY_TAB_TITLE = 'ADD_COMPANY_TAB_TITLE',
  FIND_COMPANY_TAB_TITLE = 'FIND_COMPANY_TAB_TITLE',
  DELETE_COMPANY_TAB_TITLE = 'DELETE_COMPANY_TAB_TITLE',
  GET_COMPANY_WHITE_LABEL_PROPERTIES = 'GET_COMPANY_WHITE_LABEL_PROPERTIES',

  FIND_ACTION_RULES = 'FIND_ACTION_RULES',
  FIND_ACTION_RULE = 'FIND_ACTION_RULE',
  CREATE_ACTION_RULES = 'CREATE_ACTION_RULES',
  FIND_ACTION_RULES_FOR_TABLE = 'FIND_ACTION_RULES_FOR_TABLE',
  DELETE_ACTION_RULE_IN_TABLE = 'DELETE_ACTION_RULE_IN_TABLE',
  FIND_ACTION_RULE_BY_ID = 'FIND_ACTION_RULE_BY_ID',
  UPDATE_ACTION_RULE = 'UPDATE_ACTION_RULE',
  UPDATE_ACTION_RULES = 'UPDATE_ACTION_RULES',
  DELETE_ACTION_RULE = 'DELETE_ACTION_RULE',
  FIND_ACTION_RULE_CUSTOM_EVENTS = 'FIND_ACTION_RULE_CUSTOM_EVENTS',
  ACTIVATE_TABLE_ACTIONS_IN_EVENT = 'ACTIVATE_TABLE_ACTIONS_IN_EVENT',

  CREATE_API_KEY = 'CREATE_API_KEY',
  GET_API_KEYS = 'GET_API_KEYS',
  GET_API_KEY = 'GET_API_KEY',
  DELETE_API_KEY = 'DELETE_API_KEY',

  REQUEST_INFO_FROM_TABLE_WITH_AI = 'REQUEST_INFO_FROM_TABLE_WITH_AI',

  CREATE_THREAD_WITH_AI_ASSISTANT = 'CREATE_THREAD_WITH_AI_ASSISTANT',
  ADD_MESSAGE_TO_THREAD_WITH_AI_ASSISTANT = 'ADD_MESSAGE_TO_THREAD_WITH_AI_ASSISTANT',
  GET_ALL_USER_THREADS_WITH_AI_ASSISTANT = 'GET_ALL_USER_THREADS_WITH_AI_ASSISTANT',
  GET_ALL_THREAD_MESSAGES = 'GET_ALL_THREAD_MESSAGES',
  DELETE_THREAD_WITH_AI_ASSISTANT = 'DELETE_THREAD_WITH_AI_ASSISTANT',

  CREATE_TABLE_FILTERS = 'CREATE_TABLE_FILTERS',
  FIND_TABLE_FILTERS = 'FIND_TABLE_FILTERS',
  DELETE_TABLE_FILTERS = 'DELETE_TABLE_FILTERS',
}
