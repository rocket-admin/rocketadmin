import { UserInfoMessageData } from '../../table-actions/table-actions-module/table-action-activation.service.js';
import { escapeHtml } from '../utils/escape-html.util.js';

export const EMAIL_TEXT = {
  ROCKETADMIN_REMINDER: {
    EMAIL_SUBJECT: 'Can we help you with your Rocketadmin database connection?',
    EMAIL_TEXT: `Hi there!
  
    We saw you tried to connect a database to our tool but didn't finish. Need any help? Just reply to this email, and our support team will be happy to assist!
  
    Thanks.
    `,
  },

  COMPANY_2FA_ENABLED: {
    EMAIL_SUBJECT: '2FA was enabled in your company',
    EMAIL_TEXT: (companyName: string): string => {
      companyName = escapeHtml(companyName);
      return `Administrator enabled two-factor authentication for you company "${companyName}". Please enable 2FA in your account. It will be required for login soon.`;
    },
  },

  INVITE_IN_GROUP: {
    EMAIL_SUBJECT: 'You were added to a group on Rocketadmin',
    EMAIL_TEXT: (groupTitle: string): string => {
      groupTitle = escapeHtml(groupTitle);
      return `You have been added to the "${groupTitle}" group. Glad to see you there.`;
    },
  },

  INVITE_IN_COMPANY: {
    EMAIL_SUBJECT: 'You were invited to a company on Rocketadmin',
    EMAIL_TEXT: (link: string, companyName: string) => {
      return `You have been added to a company${companyName}in the Rocketadmin project.
      Please follow the link and accept the invitation:
        ${link}`;
    },
  },

  CONFIRM_EMAIL: {
    EMAIL_SUBJECT: `Finish your registration in Rocketadmin`,
    EMAIL_TEXT: (link: string) =>
      `To keep your account secure, we need to verify your email address. Please follow the link to complete the verification.
       ${link}`,
  },

  CHANGED_EMAIL: {
    EMAIL_SUBJECT: 'Your Rocketadmin email has been successfully changed',
    EMAIL_TEXT: 'Hi! Your email address has been successfully updated. Thanks!',
  },

  CHANGE_EMAIL_REQUEST: {
    EMAIL_SUBJECT: 'Email Change Request',
    EMAIL_TEXT: (link: string) => `We received a request to change your email address.
    Follow the link to confirm - ${link}.
    If you didn't request an email change, please contact our support team or reply to this email with your questions.`,
  },

  RESET_PASSWORD_REQUEST: {
    EMAIL_SUBJECT: 'Reset password request',
    EMAIL_TEXT: (link: string) => `We've received a request to change your password.
    Follow the link to confirm - ${link}.
    If you don't use this link within 3 hours, it will expire. If you didn't request a password reset, you can ignore this email; your password will not be changed.`,
  },

  ACTION_EMAIL: {
    EMAIL_SUBJECT: 'Rocketadmin action notification',
    EMAIL_TEXT: (
      userInfo: UserInfoMessageData,
      action: string,
      tableName: string,
      primaryKeyValuesArray: Array<Record<string, unknown>>,
    ): string => {
      const { email, userId, userName } = userInfo;
      const textContent = `${userName ? escapeHtml(userName) : 'User'} (email: ${email}, user id: ${userId}) has ${action} in the table "${escapeHtml(tableName)}".`;
      return `${textContent} Primary Keys: ${JSON.stringify(primaryKeyValuesArray)}`;
    },
  },
};
