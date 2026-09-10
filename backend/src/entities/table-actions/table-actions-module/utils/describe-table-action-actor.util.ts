import { escapeHtml } from '../../../email/utils/escape-html.util.js';

// Who performed the operation a table action reacts to.
// - 'rocketadmin_user': the historical case — a RocketAdmin account acting through the admin panel
//   (or the API), resolved from its user id.
// - 'sitenova_visitor': an end-user of a generated SiteNova website whose write reached the core
//   through universal-backend's row-event bridge (POST /internal/sitenova/row-event, plan 37). Such
//   a visitor has NO RocketAdmin account: what is known is their users-row primary key (the token
//   `uid`) and, when the site passed it along, the address they registered with.
export type TableActionActorKind = 'rocketadmin_user' | 'sitenova_visitor';

export type UserInfoMessageData = {
	actorKind: TableActionActorKind;
	// RocketAdmin user id; null for a site visitor.
	userId: string | null;
	email: string | null;
	userName: string | null;
	// The visitor's users-row primary key (token uid); null for a RocketAdmin user.
	visitorId: string | null;
};

// One sentence subject for Slack and email notifications. The RocketAdmin-user wording is the
// historical one (kept byte-for-byte — downstream Slack filters may match on it); the visitor
// wording never claims a RocketAdmin identity for someone who has none.
export function describeTableActionActor(userInfo: UserInfoMessageData): string {
	if (userInfo.actorKind === 'sitenova_visitor') {
		const details: Array<string> = [];
		if (userInfo.visitorId) {
			details.push(`visitor id: ${escapeHtml(userInfo.visitorId)}`);
		}
		if (userInfo.email) {
			details.push(`email: ${escapeHtml(userInfo.email)}`);
		}
		return details.length ? `Site visitor (${details.join(', ')})` : 'Site visitor';
	}
	const { email, userId, userName } = userInfo;
	return `${userName ? escapeHtml(userName) : 'User'} (email: ${email}, user id: ${userId})`;
}
