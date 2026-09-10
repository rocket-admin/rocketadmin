import test from 'ava';
import {
	describeTableActionActor,
	UserInfoMessageData,
} from '../../../src/entities/table-actions/table-actions-module/utils/describe-table-action-actor.util.js';

// The subject line of every Slack / email table-action notification (plan 37 made it actor-aware).
// The RocketAdmin-user wording is a contract: it predates the actor notion and downstream Slack
// filters may match on it, so it is pinned byte-for-byte. A site visitor is described as such —
// never under a RocketAdmin identity.

const RA_USER: UserInfoMessageData = {
	actorKind: 'rocketadmin_user',
	userId: 'u-123',
	email: 'owner@company.io',
	userName: 'Ada',
	visitorId: null,
};

test('a RocketAdmin user keeps the historical wording', (t) => {
	t.is(describeTableActionActor(RA_USER), 'Ada (email: owner@company.io, user id: u-123)');
	t.is(describeTableActionActor({ ...RA_USER, userName: null }), 'User (email: owner@company.io, user id: u-123)');
});

test('a RocketAdmin user name is HTML-escaped', (t) => {
	t.is(
		describeTableActionActor({ ...RA_USER, userName: '<b>Ada</b>' }),
		'&lt;b&gt;Ada&lt;/b&gt; (email: owner@company.io, user id: u-123)',
	);
});

test('a site visitor is described by visitor id and email, never as a RocketAdmin user', (t) => {
	const visitor: UserInfoMessageData = {
		actorKind: 'sitenova_visitor',
		userId: null,
		email: 'v@site.io',
		userName: null,
		visitorId: '7',
	};
	t.is(describeTableActionActor(visitor), 'Site visitor (visitor id: 7, email: v@site.io)');
	t.is(describeTableActionActor({ ...visitor, email: null }), 'Site visitor (visitor id: 7)');
	t.is(describeTableActionActor({ ...visitor, visitorId: null }), 'Site visitor (email: v@site.io)');
	t.is(describeTableActionActor({ ...visitor, visitorId: null, email: null }), 'Site visitor');
});

test('visitor-supplied values are HTML-escaped', (t) => {
	t.is(
		describeTableActionActor({
			actorKind: 'sitenova_visitor',
			userId: null,
			email: '<script>x</script>',
			userName: null,
			visitorId: '"7"',
		}),
		'Site visitor (visitor id: &quot;7&quot;, email: &lt;script&gt;x&lt;/script&gt;)',
	);
});
