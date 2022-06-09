import { CreateConnectionDto } from '../../entities/connection/dto';
import { getProcessVariable } from '../get-process-variable';
import { ConnectionTypeEnum } from '../../enums';

export const Constants = {
  JWT_COOKIE_KEY_NAME: 'jwt',
  FORBIDDEN_HOSTS: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', 'fd00::/8'],
  BINARY_DATATYPES: ['binary', 'bytea', 'varbinary', 'varbinary(max)'],
  DEFAULT_LOG_ROWS_LIMIT: 500,
  MIDNIGHT_CRON_KEY: `44aea3c3-68f9-4c19-926c-40d2d5b502a2`,
  MORNING_CRON_KEY: `15ccb8d8-9b64-4d38-9f71-39b3a56c04d8`,
  CONNECTION_KEYS_NONE_PERMISSION: ['id', 'title', 'database', 'type'],

  PASSWORD_SALT_LENGTH: 64,
  BYTE_TO_STRING_ENCODING: 'hex' as BufferEncoding,
  PASSWORD_HASH_ITERATIONS: 10000,
  PASSWORD_LENGTH: 256,
  DIGEST: 'sha512',

  ONE_WEEK_AGO: (): Date => {
    const today = new Date();
    const oneWeekAgo = today.getDate() - 7;
    today.setDate(oneWeekAgo);
    return today;
  },

  TWO_WEEKS_AGO: (): Date => {
    const currentDate = Date.now();
    const twoWeeksInMs = 1209600000;
    const dateTwoWeeksAgoInMs = currentDate - twoWeeksInMs;
    return new Date(dateTwoWeeksAgoInMs);
  },

  ONE_DAY_AGO: (): Date => {
    return new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  },

  CRON_SHEDULE: '30 5 13 * * *',
  COUNT_QUERY_TIMEOUT_MS: 2000,
  EMAIL_VALIDATION_TIMEOUT: 1000,

  DEFAULT_PAGINATION: { page: 1, perPage: 20 },

  DEFAULT_SLACK_CHANNEL: '#autoadmin',
  EXCEPTIONS_CHANNELS: '#autoadmin-errors',
  KEEP_ALIVE_INTERVAL: 30000,
  KEEP_ALIVE_COUNT_MAX: 120,
  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 50,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: async function (key, n): Promise<void> {
      await n.destroy();
    },
    maxAge: 1000 * 60 * 60,
  },

  DEFAULT_TUNNEL_CACHE_OPTIONS: {
    max: 10000,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: async function (key, n): Promise<void> {
      await n.knex.destroy();
      await n.tnl.close();
    },
    maxAge: 1000 * 60 * 60,
  },

  DEFAULT_DRIVER_CACHE_OPTIONS: {
    max: 50,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: function (key, n): number {
      return 1;
    },
    maxAge: 1000 * 60 * 60,
  },

  DEFAULT_SETTINGS_CACHE_OPTIONS: {
    max: 1000,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: function (key, n): number {
      return 1;
    },
    maxAge: 1000 * 60 * 60,
  },

  DEFAULT_CONNECTIONS_CACHE_OPTIONS: {
    max: 1000,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: function (key, n): number {
      return 1;
    },
    maxAge: 1000 * 60 * 60,
  },

  DEFAULT_USER_EMAILS_CACHE_OPTIONS: {
    max: 1000,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: function (key, n): number {
      return 1;
    },
    maxAge: 3600000 * 3,
  },

  DEFAULT_INVITATION_CACHE_OPTIONS: {
    max: 10000,
    length: function (n, key): number {
      return n * 2 + key.length;
    },
    dispose: function (key, n): number {
      return 1;
    },
    maxAge: 1000 * 60 * 60,
  },

  DEFAULT_FORWARD_IN_HOST: '127.0.0.1',
  AUTOCOMPLETE_ROW_LIMIT: 20,

  FOREIGN_KEY_FIELDS: ['referenced_column_name', 'referenced_table_name', 'constraint_name', 'column_name'],

  TEST_CONNECTION_TO_POSTGRES: {
    title: 'Test connection to Postgres.',
    masterEncryption: false,
    type: ConnectionTypeEnum.postgres,
    username: getProcessVariable('POSTGRES_CONNECTION_USERNAME') || null,
    password: getProcessVariable('POSTGRES_CONNECTION_PASSWORD') || null,
    host: getProcessVariable('POSTGRES_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('POSTGRES_CONNECTION_PORT')) || null,
    database: getProcessVariable('POSTGRES_CONNECTION_DATABASE') || null,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_MSSQL: {
    title: 'Test connection to MSSQL',
    masterEncryption: false,
    type: ConnectionTypeEnum.mssql,
    host: getProcessVariable('MSSQL_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('MSSQL_CONNECTION_PORT')) || null,
    password: getProcessVariable('MSSQL_CONNECTION_PASSWORD') || null,
    username: getProcessVariable('MSSQL_CONNECTION_USERNAME') || null,
    database: getProcessVariable('MSSQL_CONNECTION_DATABASE') || null,
    ssh: false,
    ssl: false,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_ORACLE: {
    title: 'Test connection to OracleDB',
    type: ConnectionTypeEnum.oracledb,
    host: getProcessVariable('ORACLE_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('ORACLE_CONNECTION_PORT')) || null,
    username: getProcessVariable('ORACLE_CONNECTION_USERNAME') || null,
    password: getProcessVariable('ORACLE_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('ORACLE_CONNECTION_DATABASE') || null,
    sid: getProcessVariable('ORACLE_CONNECTION_SID') || null,
    isTestConnection: true,
  },

  TEST_SSH_CONNECTION_TO_MYSQL: {
    title: 'Test connection via SSH tunnel to mySQL',
    type: ConnectionTypeEnum.mysql,
    host: getProcessVariable('MYSQL_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('MYSQL_CONNECTION_PORT')) || null,
    username: getProcessVariable('MYSQL_CONNECTION_USERNAME') || null,
    password: getProcessVariable('MYSQL_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('MYSQL_CONNECTION_DATABASE') || null,
    ssh: true,
    isTestConnection: true,
    sshHost: getProcessVariable('MYSQL_CONNECTION_SSH_HOST') || null,
    sshPort: getProcessVariable('MYSQL_CONNECTION_SSH_PORT') || null,
    sshUsername: getProcessVariable('MYSQL_CONNECTION_SSH_USERNAME') || null,
    privateSSHKey: getProcessVariable('MYSQL_CONNECTION_SSH_KEY') || null,
  },

  REMOVED_PASSWORD_VALUE: '***',

  getTestConnectionsArr: function (): Array<CreateConnectionDto> {
    const isSaaS = process.env.IS_SAAS;
    if (!isSaaS || isSaaS !== 'true') {
      return [];
    }
    const testConnections: Array<CreateConnectionDto> = [];
    testConnections.push(
      this.TEST_CONNECTION_TO_ORACLE,
      this.TEST_CONNECTION_TO_POSTGRES,
      this.TEST_SSH_CONNECTION_TO_MYSQL,
      this.TEST_CONNECTION_TO_MSSQL,
    );
    return testConnections.filter((dto) => {
      const values = Object.values(dto);
      const nullElementIndex = values.findIndex((el) => el === null);
      return nullElementIndex < 0;
    });
  },

  getTestConnectionsHostNamesArr: function (): Array<string> {
    return this.getTestConnectionsArr().map((connection) => connection.host);
  },

  AUTOADMIN_SUPPORT_MAIL: 'support@autoadmin.org',
  AUTOADMIN_EMAIL_TEXT: `Hi!

  We've noticed that you attempted to add a connection in our tool, but did not complete it.
  Did you have any issues while adding your connection? Do you need any assistance?
  Our support will be happy to help or to listen for your feedback.
  Just reply to this email with your questions.

  Thanks.
  `,
  AUTOADMIN_EMAIL_BODY: `<body>
  <p>
  Hi!
  </p>
  <p>
  We've noticed that you attempted to add a connection in our tool, but did not complete it.
  Did you have any issues while adding your connection? Do you need any assistance?
  Our support will be happy to help or to listen for your feedback.
  Just reply to this email with your questions.
  </p>
  <p>
  Thanks.
  </p>
 </body>`,

  AUTOADMIN_EMAIL_SUBJECT_DATA: 'Can we help you with your Autoadmin database connection?',

  EMAIL: {
    AUTOADMIN_SUPPORT_MAIL: 'support@autoadmin.org',
    API_PATH: 'v2.autoadmin.org/api',
    PASSWORD: {
      RESET_PASSWORD_REQUEST_SUBJECT_DATA: 'Reset password requested',
      RESET_PASSWORD_EMAIL_TEXT: function (requestString: string): string {
        return `Hi! Password change requested. Follow the link to confirm - https://v2.autoadmin.org/api/user/password/reset/verify/${requestString}
         If it wasn't you, please contact our support team.`;
      },
      RESET_PASSWORD_EMAIL_HTML: function (requestString: string): string {
        return `
        <body>
          <p>
            Hi!
          </p>
          <p>
          Password change requested. Follow the link to confirm -
          <a href="https://${Constants.EMAIL.API_PATH}user/password/reset/verify/${requestString}"></a>
          </p>
          <p>
          If it wasn't you, please contact our support team or reply to this email with your questions.
          </p>
          <p>
          Thanks.
          </p>
        </body>
        `;
      },

      NEW_PASSWORD_SUBJECT_DATA: `Password for Autoadmin changed`,
      NEW_PASSWORD_EMAIL_TEXT: function (newPassword: string): string {
        return `Hi! Your password for Autoadmin has been changed. Your new password is: ${newPassword}
         If it wasn't you, please contact our support team.`;
      },
      NEW_PASSWORD_EMAIL_HTML: function (newPassword: string): string {
        return `
        <body>
          <p>
            Hi!
          </p>
          <p>
          Your password for Autoadmin has been changed. Your new password is:
          <b>${newPassword}</b>
          </p>
          <p>
          If it wasn't you, please contact our support team or reply to this email with your questions.
          </p>
          <p>
          Thanks.
          </p>
        </body>
        `;
      },
    },
    EMAIL: {
      CHANGE_EMAIL_SUBJECT_DATA: 'Change email requested',
      CHANGE_EMAIL_TEXT: function (requestString: string) {
        return `Hi! Email change requested. Follow the link to confirm - https://${Constants.EMAIL.API_PATH}/user/email/change/verify/${requestString}
         If it wasn't you, please contact our support team.`;
      },
      CHANGED_EMAIL_TEXT: 'Hi! Your email successfully changed.',
      CHANGED_EMAIL_SUBJECT_DATA: 'Your Autoadmin email changed',
      CHANGE_EMAIL_HTML: function (requestString: string) {
        return `
        <body>
          <p>
            Hi!
          </p>
          <p>
          Password email change requested. Follow the link to confirm -
          <a href="https://${Constants.EMAIL.API_PATH}/user/email/change/verify/${requestString}"></a>
          </p>
          <p>
          If it wasn't you, please contact our support team or reply to this email with your questions.
          </p>
          <p>
          Thanks.
          </p>
        </body>
        `;
      },
      CHANGED_EMAIL_HTML: `<body>
          <p>
            Hi!
          </p>
          <p>
            Your email successfully changed.
          </p>
          <p>
            Thanks.
          </p>
      </body>
      `,
      CONFIRM_EMAIL_SUBJECT: `Finish your registration in Autoadmin project`,
      CONFIRM_EMAIL_TEXT: function (verificationString: string) {
        return `Hi! You have registered in the Autoadmin project. Please follow the link and verify your email:
       https://${Constants.EMAIL.API_PATH}/user/email/verify/${verificationString}
       `;
      },
      CONFIRM_EMAIL_HTML: function (verificationString: string) {
        return `
         <body>
          <p>
            Hi!
          </p>
          <p>
          Password email change requested. Follow the link to confirm -
          <a href="https://${Constants.EMAIL.API_PATH}/user/email/verify/${verificationString}"></a>
          </p>
          <p>
          If it wasn't you, please contact our support team or reply to this email with your questions.
          </p>
          <p>
          Thanks.
          </p>
        </body>
`;
      },
    },
    GROUP_INVITE: {
      GROUP_INVITE_SUBJECT_DATA: 'You were invited to a group in the Autoadmin project',
      GROUP_INVITE_TEXT_DATA: function (verificationString) {
        return `You have been added to a group in the Autoadmin project.
         Please follow the link and accept the invitation:
           https://${Constants.EMAIL.API_PATH}/group/user/verify/${verificationString}/`;
      },
      GROUP_INVITE_HTML_DATA: function (verificationString) {
        return `
        <body>
          <p>
            Hi!
          </p>
          <p>
          You have been added to a group in the Autoadmin project.
          Please follow the link and accept the invitation:
          <a href="https://${Constants.EMAIL.API_PATH}/group/user/verify/${verificationString}"></a>
          </p>
          <p>
            Thanks.
          </p>
        </body>
        `;
      },
    },
  },
};
