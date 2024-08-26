import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { CreateConnectionDto } from '../../entities/connection/application/dto/create-connection.dto.js';
import { Knex } from 'knex';
import { getProcessVariable } from '../get-process-variable.js';

export const Constants = {
  ROCKETADMIN_AUTHENTICATED_COOKIE: 'rocketadmin_authenticated',
  JWT_COOKIE_KEY_NAME: 'rocketadmin_cookie',
  FORBIDDEN_HOSTS: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', 'fd00::/8'],
  BINARY_DATATYPES: ['binary', 'bytea', 'varbinary', 'varbinary(max)', 'tinyblob', 'blob', 'mediumblob', 'longblob'],
  DEFAULT_LOG_ROWS_LIMIT: 500,
  MIDNIGHT_CRON_KEY: 1,
  MORNING_CRON_KEY: 2,
  CONNECTION_KEYS_NONE_PERMISSION: ['id', 'title', 'database', 'type', 'connection_properties', 'isTestConnection'],
  FREE_PLAN_USERS_COUNT: 3,
  MAX_FILE_SIZE_IN_BYTES: 10485760,

  VERIFICATION_STRING_WHITELIST: () => {
    const numbers = [...Array(10).keys()].map((num) => num.toString());
    const alpha = Array.from(Array(26)).map((e, i) => i + 65);
    const letters = alpha.map((x) => String.fromCharCode(x).toLowerCase());
    return [...numbers, ...letters];
  },

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

  LARGE_DATASET_ROW_LIMIT: 100000,

  DEFAULT_SLACK_CHANNEL: '#errors',
  EXCEPTIONS_CHANNELS: '#errors',
  KEEP_ALIVE_INTERVAL: 30000,
  KEEP_ALIVE_COUNT_MAX: 120,

  DEFAULT_CONNECTION_CACHE_OPTIONS: {
    max: 150,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    dispose: async (knex: Knex) => {
      await knex.destroy();
    },
  },

  DEFAULT_TUNNEL_CACHE_OPTIONS: {
    max: 100,
    ttl: 1000 * 60 * 60,
    dispose: async (tnl: any) => {
      try {
        await tnl.close();
      } catch (e) {
        console.error('Tunnel closing error: ' + e);
      }
    },
  },

  DEFAULT_DRIVER_CACHE_OPTIONS: {
    max: 50,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_INVITATION_CACHE_OPTIONS: {
    max: 200,
    ttl: 1000 * 60 * 60,
  },

  DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS: {
    max: 1000,
    ttl: 1000 * 60,
  },

  DEFAULT_TABLE_PERMISSIONS_CACHE_OPTIONS: {
    max: 1000,
    ttl: 1000 * 10,
  },

  DEFAULT_FORWARD_IN_HOST: '127.0.0.1',
  AUTOCOMPLETE_ROW_LIMIT: 20,

  FOREIGN_KEY_FIELDS: ['referenced_column_name', 'referenced_table_name', 'constraint_name', 'column_name'],

  TEST_CONNECTION_TO_POSTGRES: {
    title: 'Postgres',
    masterEncryption: false,
    type: ConnectionTypesEnum.postgres,
    username: getProcessVariable('POSTGRES_CONNECTION_USERNAME') || null,
    password: getProcessVariable('POSTGRES_CONNECTION_PASSWORD') || null,
    host: getProcessVariable('POSTGRES_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('POSTGRES_CONNECTION_PORT')) || null,
    database: getProcessVariable('POSTGRES_CONNECTION_DATABASE') || null,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_MSSQL: {
    title: 'MSSQL',
    masterEncryption: false,
    type: ConnectionTypesEnum.mssql,
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
    title: 'Oracle',
    type: ConnectionTypesEnum.oracledb,
    host: getProcessVariable('ORACLE_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('ORACLE_CONNECTION_PORT')) || null,
    username: getProcessVariable('ORACLE_CONNECTION_USERNAME') || null,
    password: getProcessVariable('ORACLE_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('ORACLE_CONNECTION_DATABASE') || null,
    sid: getProcessVariable('ORACLE_CONNECTION_SID') || null,
    isTestConnection: true,
  },

  TEST_SSH_CONNECTION_TO_MYSQL: {
    title: 'MySQL',
    type: ConnectionTypesEnum.mysql,
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

  TEST_CONNECTION_TO_MONGO: {
    title: 'MongoDB',
    type: ConnectionTypesEnum.mongodb,
    host: getProcessVariable('MONGO_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('MONGO_CONNECTION_PORT')) || null,
    username: getProcessVariable('MONGO_CONNECTION_USERNAME') || null,
    password: getProcessVariable('MONGO_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('MONGO_CONNECTION_DATABASE') || null,
    authSource: getProcessVariable('MONGO_CONNECTION_AUTH_SOURCE') || null,
    isTestConnection: true,
  },

  TEST_CONNECTION_TO_IBMBD2: {
    title: 'IBM DB2',
    type: ConnectionTypesEnum.ibmdb2,
    host: getProcessVariable('IBM_DB2_CONNECTION_HOST') || null,
    port: parseInt(getProcessVariable('IBM_DB2_CONNECTION_PORT')) || null,
    username: getProcessVariable('IBM_DB2_CONNECTION_USERNAME') || null,
    password: getProcessVariable('IBM_DB2_CONNECTION_PASSWORD') || null,
    database: getProcessVariable('IBM_DB2_CONNECTION_DATABASE') || null,
    schema: getProcessVariable('IBM_DB2_CONNECTION_SCHEMA') || null,
    isTestConnection: true,
  },

  REMOVED_PASSWORD_VALUE: '***',
  REMOVED_SENSITIVE_FIELD_IF_CHANGED: '* * * sensitive data, no logs stored * * *',
  REMOVED_SENSITIVE_FIELD_IF_NOT_CHANGED: '',

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
      this.TEST_CONNECTION_TO_MONGO,
      this.TEST_CONNECTION_TO_IBMBD2,
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

  APP_DOMAIN_ADDRESS: process.env.APP_DOMAIN_ADDRESS || `http://localhost:3000`,

  AUTOADMIN_SUPPORT_MAIL: 'support@autoadmin.org',
  AUTOADMIN_EMAIL_TEXT: `Hi there!

  We saw you tried to connect a database to our tool but didn't finish. Need any help? Just reply to this email, and our support team will be happy to assist!

  Thanks.
  `,
  AUTOADMIN_EMAIL_BODY: `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Finish your registration in Rocketadmin project</title>
    <style>
  @media only screen and (max-width: 620px) {
    table[class=body] h1 {
      font-size: 28px !important;
      margin-bottom: 10px !important;
    }

    table[class=body] p,
  table[class=body] ul,
  table[class=body] ol,
  table[class=body] td,
  table[class=body] span,
  table[class=body] a {
      font-size: 16px !important;
    }

    table[class=body] .wrapper,
  table[class=body] .article {
      padding: 10px !important;
    }

    table[class=body] .content {
      padding: 0 !important;
    }

    table[class=body] .container {
      padding: 0 !important;
      width: 100% !important;
    }

    table[class=body] .main {
      border-left-width: 0 !important;
      border-radius: 0 !important;
      border-right-width: 0 !important;
    }

    table[class=body] .btn table {
      width: 100% !important;
    }

    table[class=body] .btn a {
      width: 100% !important;
    }

    table[class=body] .img-responsive {
      height: auto !important;
      max-width: 100% !important;
      width: auto !important;
    }
  }
  @media all {
    .ExternalClass {
      width: 100%;
    }

    .ExternalClass,
  .ExternalClass p,
  .ExternalClass span,
  .ExternalClass font,
  .ExternalClass td,
  .ExternalClass div {
      line-height: 100%;
    }
  }
  </style></head>
    <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
        <tr>
          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
          <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
            <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

              <!-- START CENTERED WHITE CONTAINER -->
              <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">We saw you tried to connect a database to our tool but didn't finish.</span>
              <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                <!-- START MAIN CONTENT AREA -->
                <tr>
                  <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                      <tr>
                        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                          <a href="https://rocketadmin.com/" class="logo" style="color: #212121; text-decoration: underline; display: block; margin-bottom: 60px;">
                            <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                            </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                          <h1 class="title" style="font-size: 32px; font-weight: 600; margin-top: 20px; margin-bottom: 20px;">Welcome to <span class="title__highlighting" style="color: #A63BFB;">Rocketadmin</span></h1>
                        </td>
                      </tr>
                      <tr>
                        <td width="100%" style="font-size: 14px; font-family: sans-serif; vertical-align: top;" valign="top">
                          <img src="https://app.rocketadmin.com/assets/email-illustration.png" alt="Rocketadmin interface" class="illustration img-responsive" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%; margin-bottom: 20px;">
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                          <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                            Hi there!
                          </p>
                          <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                            We saw you tried to connect a database to our tool but didn't finish. <strong> Need any help?</strong> Just reply to this email, and our support team will be happy to assist!
                          </p>
                          <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                            Thanks.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                          <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              <!-- END MAIN CONTENT AREA -->
              </table>
            <!-- END CENTERED WHITE CONTAINER -->
            </div>
          </td>
          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
        </tr>
      </table>
    </body>
  </html>
`,

  AUTOADMIN_EMAIL_SUBJECT_DATA: 'Can we help you with your Rocketadmin database connection?',

  EMAIL: {
    AUTOADMIN_SUPPORT_MAIL: 'support@autoadmin.org',
    API_PATH: 'v2.autoadmin.org/api',
    PASSWORD: {
      RESET_PASSWORD_REQUEST_SUBJECT_DATA: 'Reset password request',
      RESET_PASSWORD_EMAIL_TEXT: function (requestString: string): string {
        return `We've received a request to change your password.
          Follow the link to confirm - ${Constants.APP_DOMAIN_ADDRESS}/external/user/password/reset/verify/${requestString}.
          If you don't use this link within 3 hours, it will expire. If you didn't request a password reset, you can ignore this email; your password will not be changed.`;
      },
      RESET_PASSWORD_EMAIL_HTML: function (requestString: string): string {
        return `
        <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <title>Reset password request</title>
            <style>
          @media only screen and (max-width: 620px) {
            table[class=body] h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important;
            }

            table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
              font-size: 16px !important;
            }

            table[class=body] .wrapper,
          table[class=body] .article {
              padding: 10px !important;
            }

            table[class=body] .content {
              padding: 0 !important;
            }

            table[class=body] .container {
              padding: 0 !important;
              width: 100% !important;
            }

            table[class=body] .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important;
            }

            table[class=body] .btn table {
              width: 100% !important;
            }

            table[class=body] .btn a {
              width: 100% !important;
            }

            table[class=body] .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important;
            }
          }
          @media all {
            .ExternalClass {
              width: 100%;
            }

            .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
              line-height: 100%;
            }
          }
          </style></head>
            <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
                <tr>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                  <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
                    <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

                      <!-- START CENTERED WHITE CONTAINER -->
                      <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">We've received a request to change your password.</span>
                      <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                        <!-- START MAIN CONTENT AREA -->
                        <tr>
                          <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <a href="https://rocketadmin.com/" class="logo" style="color: #212121; text-decoration: underline; display: block; margin-bottom: 60px;">
                                    <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                                    </a>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <h1 class="title" style="font-size: 32px; font-weight: 600; line-height: 1.15; margin-top: 20px; margin-bottom: 40px;">We've received a request to change your password.</h1>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                    To reset your password, click the button below:
                                  </p>
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; min-width: 100%; width: 100%;" width="100%">
                                    <tbody>
                                      <tr>
                                        <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;" valign="top">
                                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: auto; width: auto;" width="auto">
                                            <tbody>
                                              <tr>
                                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; border-radius: 5px; text-align: center; background-color: #212121;" valign="top" align="center" bgcolor="#212121"> <a href="${Constants.APP_DOMAIN_ADDRESS}/external/user/password/reset/verify/${requestString}" target="_blank" style="border: solid 1px #212121; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; text-transform: capitalize; background-color: #212121; border-color: #212121; color: #ffffff;">Reset Password</a> </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">
                                    <strong>Note:</strong> If you don't use this link within 3 hours, it will expire.
                                  </p>
                                  <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">If you didn't request a password reset, you can ignore this email; your password will not be changed.</p>
                                </td>
                              </tr>
                              <tr>
                                <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                                  <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                      <!-- END MAIN CONTENT AREA -->
                      </table>
                    <!-- END CENTERED WHITE CONTAINER -->
                    </div>
                  </td>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                </tr>
              </table>
            </body>
          </html>

        `;
      },

      NEW_PASSWORD_SUBJECT_DATA: `Password for Rocketadmin changed`,
      NEW_PASSWORD_EMAIL_TEXT: function (newPassword: string): string {
        return `Hi! Your password for Rocketadmin has been changed. Your new password is: ${newPassword}
         If it wasn't you, please contact our support team.`;
      },
      NEW_PASSWORD_EMAIL_HTML: function (newPassword: string): string {
        return `
        <body>
          <p>
            Hi!
          </p>
          <p>
          Your password for Rocketadmin has been changed. Your new password is:
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
      CHANGE_EMAIL_SUBJECT_DATA: 'Email Change Request',
      CHANGE_EMAIL_TEXT: function (requestString: string) {
        return `We received a request to change your email address.
          Follow the link to confirm - ${Constants.APP_DOMAIN_ADDRESS}/external/user/email/change/verify/${requestString}.
          If you didn't request an email change, please contact our support team or reply to this email with your questions.`;
      },
      CHANGED_EMAIL_TEXT: 'Hi! Your email address has been successfully updated. Thanks!',
      CHANGED_EMAIL_SUBJECT_DATA: 'Your Rocketadmin email has been successfully changed',
      CHANGE_EMAIL_HTML: function (requestString: string) {
        return `
        <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <title>Email Change Request</title>
            <style>
          @media only screen and (max-width: 620px) {
            table[class=body] h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important;
            }

            table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
              font-size: 16px !important;
            }

            table[class=body] .wrapper,
          table[class=body] .article {
              padding: 10px !important;
            }

            table[class=body] .content {
              padding: 0 !important;
            }

            table[class=body] .container {
              padding: 0 !important;
              width: 100% !important;
            }

            table[class=body] .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important;
            }

            table[class=body] .btn table {
              width: 100% !important;
            }

            table[class=body] .btn a {
              width: 100% !important;
            }

            table[class=body] .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important;
            }
          }
          @media all {
            .ExternalClass {
              width: 100%;
            }

            .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
              line-height: 100%;
            }
          }
          </style></head>
            <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
                <tr>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                  <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
                    <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

                      <!-- START CENTERED WHITE CONTAINER -->
                      <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">We received a request to change your email address.</span>
                      <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                        <!-- START MAIN CONTENT AREA -->
                        <tr>
                          <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <a href="https://rocketadmin.com/" class="logo" style="color: #212121; text-decoration: underline; display: block; margin-bottom: 60px;">
                                    <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                                    </a>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <h1 class="title" style="font-size: 32px; font-weight: 600; line-height: 1.15; margin-top: 20px; margin-bottom: 40px;">We received a request to change your email address.</h1>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                    To update your email, click the button below:
                                  </p>
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; min-width: 100%; width: 100%;" width="100%">
                                    <tbody>
                                      <tr>
                                        <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;" valign="top">
                                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: auto; width: auto;" width="auto">
                                            <tbody>
                                              <tr>
                                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; border-radius: 5px; text-align: center; background-color: #212121;" valign="top" align="center" bgcolor="#212121"> <a href="${Constants.APP_DOMAIN_ADDRESS}/external/user/email/change/verify/${requestString}" target="_blank" style="border: solid 1px #212121; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; text-transform: capitalize; background-color: #212121; border-color: #212121; color: #ffffff;">Change Email</a> </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">If you didn’t request an email change, please contact our support team or reply to this email with your questions.</p>
                                </td>
                              </tr>
                              <tr>
                                <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                                  <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                      <!-- END MAIN CONTENT AREA -->
                      </table>
                    <!-- END CENTERED WHITE CONTAINER -->
                    </div>
                  </td>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                </tr>
              </table>
            </body>
          </html>

        `;
      },
      CHANGED_EMAIL_HTML: `<!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <title>Email has been successfully changed</title>
          <style>
        @media only screen and (max-width: 620px) {
          table[class=body] h1 {
            font-size: 28px !important;
            margin-bottom: 10px !important;
          }

          table[class=body] p,
        table[class=body] ul,
        table[class=body] ol,
        table[class=body] td,
        table[class=body] span,
        table[class=body] a {
            font-size: 16px !important;
          }

          table[class=body] .wrapper,
        table[class=body] .article {
            padding: 10px !important;
          }

          table[class=body] .content {
            padding: 0 !important;
          }

          table[class=body] .container {
            padding: 0 !important;
            width: 100% !important;
          }

          table[class=body] .main {
            border-left-width: 0 !important;
            border-radius: 0 !important;
            border-right-width: 0 !important;
          }
        }
        @media all {
          .ExternalClass {
            width: 100%;
          }

          .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
            line-height: 100%;
          }
        }
        </style></head>
          <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
              <tr>
                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
                  <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

                    <!-- START CENTERED WHITE CONTAINER -->
                    <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">Your email address has been successfully updated.</span>
                    <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                      <!-- START MAIN CONTENT AREA -->
                      <tr>
                        <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                            <tr>
                              <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                <a href="https://rocketadmin.com/" class="logo" style="display: block; margin-bottom: 60px;">
                                  <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                                  </a>
                              </td>
                            </tr>
                            <tr>
                              <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                  Your email address has been successfully updated.
                                </p>
                                <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">Thanks!</p>
                              </td>
                            </tr>
                            <tr>
                              <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                                <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                    <!-- END MAIN CONTENT AREA -->
                    </table>
                  <!-- END CENTERED WHITE CONTAINER -->
                  </div>
                </td>
                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
              </tr>
            </table>
          </body>
        </html>
      `,
      CONFIRM_EMAIL_SUBJECT: `Finish your registration in Rocketadmin`,
      CONFIRM_EMAIL_TEXT: function (verificationString: string) {
        return `To keep your account secure, we need to verify your email address. Please follow the link to complete the verification.
       ${Constants.APP_DOMAIN_ADDRESS}/external/user/email/verify/${verificationString}
       `;
      },
      CONFIRM_EMAIL_HTML: function (verificationString: string) {
        return `
         <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <title>Finish your registration in Rocketadmin project</title>
            <style>
          @media only screen and (max-width: 620px) {
            table[class=body] h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important;
            }

            table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
              font-size: 16px !important;
            }

            table[class=body] .wrapper,
          table[class=body] .article {
              padding: 10px !important;
            }

            table[class=body] .content {
              padding: 0 !important;
            }

            table[class=body] .container {
              padding: 0 !important;
              width: 100% !important;
            }

            table[class=body] .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important;
            }

            table[class=body] .btn table {
              width: 100% !important;
            }

            table[class=body] .btn a {
              width: 100% !important;
            }

            table[class=body] .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important;
            }
          }
          @media all {
            .ExternalClass {
              width: 100%;
            }

            .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
              line-height: 100%;
            }
          }
          </style></head>
            <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
                <tr>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                  <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
                    <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

                      <!-- START CENTERED WHITE CONTAINER -->
                      <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">Complete your registration.</span>
                      <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                        <!-- START MAIN CONTENT AREA -->
                        <tr>
                          <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <a href="https://rocketadmin.com/" class="logo" style="color: #ec0867; text-decoration: underline; display: block; margin-bottom: 60px;">
                                    <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                                    </a>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <h1 class="title" style="font-size: 32px; font-weight: 600; margin-top: 20px; margin-bottom: 20px;">Complete your registration</h1>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                    To keep your account secure, we need to verify your email address. Please follow the link below to complete the verification.
                                  </p>
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; min-width: 100%; width: 100%;" width="100%">
                                    <tbody>
                                      <tr>
                                        <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;" valign="top">
                                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: auto; width: auto;" width="auto">
                                            <tbody>
                                              <tr>
                                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; border-radius: 5px; text-align: center; background-color: #212121;" valign="top" align="center" bgcolor="#212121"> <a href="${Constants.APP_DOMAIN_ADDRESS}/external/user/email/verify/${verificationString}" target="_blank" style="border: solid 1px #212121; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 45px; text-decoration: none; text-transform: capitalize; background-color: #212121; border-color: #212121; color: #ffffff;">Verify</a> </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">
                                    <strong>Why did I receive this?</strong><br>
                                    Your email address was entered on RocketAdmin to be used for login access. If you received this message by mistake, please contact us at support@rocketadmin.com.
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                                  <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                      <!-- END MAIN CONTENT AREA -->
                      </table>
                    <!-- END CENTERED WHITE CONTAINER -->
                    </div>
                  </td>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                </tr>
              </table>
            </body>
          </html>

`;
      },
    },
    GROUP_INVITE: {
      GROUP_INVITE_SUBJECT_DATA: 'You were added to a group on Rocketadmin',
      GROUP_INVITE_TEXT_DATA: function (groupTitle: string) {
        return `You have been added to the "${groupTitle}" group. Glad to see you there.`;
      },
      GROUP_INVITE_HTML_DATA: function (groupTitle: string) {
        return `
        <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <title>You were added to a group on Rocketadmin</title>
            <style>
          @media only screen and (max-width: 620px) {
            table[class=body] h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important;
            }

            table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
              font-size: 16px !important;
            }

            table[class=body] .wrapper,
          table[class=body] .article {
              padding: 10px !important;
            }

            table[class=body] .content {
              padding: 0 !important;
            }

            table[class=body] .container {
              padding: 0 !important;
              width: 100% !important;
            }

            table[class=body] .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important;
            }

            table[class=body] .btn table {
              width: 100% !important;
            }

            table[class=body] .btn a {
              width: 100% !important;
            }

            table[class=body] .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important;
            }
          }
          @media all {
            .ExternalClass {
              width: 100%;
            }

            .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
              line-height: 100%;
            }
          }
          </style></head>
            <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
                <tr>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                  <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
                    <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

                      <!-- START CENTERED WHITE CONTAINER -->
                      <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">Welcome to your new group!</span>
                      <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                        <!-- START MAIN CONTENT AREA -->
                        <tr>
                          <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <a href="https://rocketadmin.com/" class="logo" style="color: #ec0867; text-decoration: underline; display: block; margin-bottom: 60px;">
                                    <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                                    </a>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <h1 class="title" style="font-size: 32px; font-weight: 600; line-height: 1.15; margin-top: 20px; margin-bottom: 40px;">Welcome to Your New Group!</h1>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                    You have been added to the "${groupTitle}" group. Glad to see you there.
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">
                                    If you have any questions or need assistance, please feel free to reach out to our support team.
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                                  <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                      <!-- END MAIN CONTENT AREA -->
                      </table>
                    <!-- END CENTERED WHITE CONTAINER -->
                    </div>
                  </td>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                </tr>
              </table>
            </body>
          </html>

        `;
      },
    },
    COMPANY_INVITE: {
      COMPANY_INVITE_SUBJECT_DATA: 'You were invited to a company on Rocketadmin',
      COMPANY_INVITE_TEXT_DATA: function (verificationString: string, companyId: string, companyName: string) {
        return `You have been added to a company${companyName ? ` "${companyName}" ` : ` `}in the Rocketadmin project.
         Please follow the link and accept the invitation:
           ${Constants.APP_DOMAIN_ADDRESS}/company/${companyId}/verify/${verificationString}/`;
      },
      COMPANY_INVITE_HTML_DATA: function (verificationString: string, companyId: string, companyName: string) {
        return `
        <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
              <title>You were invited to a company on Rocketadmin</title>
            <style>
          @media only screen and (max-width: 620px) {
            table[class=body] h1 {
              font-size: 28px !important;
              margin-bottom: 10px !important;
            }

            table[class=body] p,
          table[class=body] ul,
          table[class=body] ol,
          table[class=body] td,
          table[class=body] span,
          table[class=body] a {
              font-size: 16px !important;
            }

            table[class=body] .wrapper,
          table[class=body] .article {
              padding: 10px !important;
            }

            table[class=body] .content {
              padding: 0 !important;
            }

            table[class=body] .container {
              padding: 0 !important;
              width: 100% !important;
            }

            table[class=body] .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important;
            }

            table[class=body] .btn table {
              width: 100% !important;
            }

            table[class=body] .btn a {
              width: 100% !important;
            }

            table[class=body] .img-responsive {
              height: auto !important;
              max-width: 100% !important;
              width: auto !important;
            }
          }
          @media all {
            .ExternalClass {
              width: 100%;
            }

            .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
              line-height: 100%;
            }
          }
          </style></head>
            <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
                <tr>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                  <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
                    <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

                      <!-- START CENTERED WHITE CONTAINER -->
                      <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">Join your company on Rocketadmin.</span>
                      <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

                        <!-- START MAIN CONTENT AREA -->
                        <tr>
                          <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <a href="https://rocketadmin.com/" class="logo" style="color: #ec0867; text-decoration: underline; display: block; margin-bottom: 60px;">
                                    <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                                    </a>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <h1 class="title" style="font-size: 32px; font-weight: 600; margin-top: 20px; margin-bottom: 20px;">You're invited to join ${companyName ? ` "${companyName}" ` : ` `} company on Rocketadmin</h1>
                                </td>
                              </tr>
                              <tr>
                                <td width="100%" style="font-size: 14px; font-family: sans-serif; vertical-align: top;" valign="top">
                                  <img src="https://app.rocketadmin.com/assets/email-illustration.png" alt="Rocketadmin interface" class="illustration img-responsive" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%; margin-bottom: 20px;">
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                                    We're excited to have you on board.
                                  </p>
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; box-sizing: border-box; min-width: 100%; width: 100%;" width="100%">
                                    <tbody>
                                      <tr>
                                        <td align="left" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;" valign="top">
                                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: auto; width: auto;" width="auto">
                                            <tbody>
                                              <tr>
                                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top; border-radius: 5px; text-align: center; background-color: #212121;" valign="top" align="center" bgcolor="#212121"> <a href="${Constants.APP_DOMAIN_ADDRESS}/company/${companyId}/verify/${verificationString}" target="_blank" style="border: solid 1px #212121; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 45px; text-decoration: none; text-transform: capitalize; background-color: #212121; border-color: #212121; color: #ffffff;">Accept Invitation</a> </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                                  <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">
                                    If you have any questions or need assistance please contact our support team or reply to this email with your questions.
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                                  <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                      <!-- END MAIN CONTENT AREA -->
                      </table>
                    <!-- END CENTERED WHITE CONTAINER -->
                    </div>
                  </td>
                  <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
                </tr>
              </table>
            </body>
          </html>

        `;
      },
    },
    COMPANY_2FA_ENABLED: {
      COMPANY_2FA_ENABLED_SUBJECT_DATA: '2FA was enabled in your company',
      COMPANY_2FA_ENABLED_TEXT_DATA: (companyName: string): string =>
        `Administrator enabled two-factor authentication for you company "${companyName}". Please enable 2FA in your account. It will be required for login soon.`,
      COMPANY_2FA_ENABLED_HTML_DATA: (companyName: string): string => `
      <body>
      <p>
        Hi!
      </p>
      <p>
      Administrator enabled two-factor authentication for you company "${companyName}". Please enable 2FA in your account. It will be required for login soon.
      </p>
      <p>
        Thanks.
      </p>
    </body>
      `,
    },
  },
};
