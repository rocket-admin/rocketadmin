import test from 'ava';
import { CompanyInfoEntity } from '../../../src/entities/company-info/company-info.entity.js';
import {
	buildFoundCompanyFullInfoDs,
	buildFoundCompanyInfoDs,
} from '../../../src/entities/company-info/utils/build-found-company-info-ds.js';
import { UserRoleEnum } from '../../../src/entities/user/enums/user-role.enum.js';
import { SubscriptionLevelEnum } from '../../../src/enums/subscription-level.enum.js';
import { FoundSassCompanyInfoDS } from '../../../src/microservices/gateways/saas-gateway.ts/data-structures/found-saas-company-info.ds.js';

// Plan 46 (2026-09-17): white label (logo / favicon / tab title) and custom domains are retired. The
// company payload must not carry the white-label fields at all — even when stale rows are still
// attached to the entity — and `custom_domain` is always null (kept for API compatibility).

function coreCompany(): CompanyInfoEntity {
	return {
		id: 'b3363e0b-0101-4bc8-86cd-02516d407b62',
		name: 'Acme',
		is2faEnabled: false,
		show_test_connections: true,
		// stale white-label rows left in the database by a former paid customer
		logo: { image: Buffer.from('png'), mimeType: 'image/png' },
		favicon: { image: Buffer.from('ico'), mimeType: 'image/png' },
		tab_title: { text: 'Acme admin' },
		connections: [],
		invitations: [],
	} as unknown as CompanyInfoEntity;
}

const saasCompany: FoundSassCompanyInfoDS = {
	id: 'b3363e0b-0101-4bc8-86cd-02516d407b62',
	createdAt: new Date('2026-01-01T00:00:00Z'),
	updatedAt: new Date('2026-02-01T00:00:00Z'),
	portal_link: 'https://billing.stripe.com/p/session/test',
	subscriptionLevel: SubscriptionLevelEnum.FREE_PLAN,
	is_payment_method_added: false,
};

test('buildFoundCompanyInfoDs (saas) carries no white-label fields and a null custom domain', (t) => {
	const ds = buildFoundCompanyInfoDs(coreCompany(), saasCompany, UserRoleEnum.ADMIN);
	t.is(ds.custom_domain, null);
	for (const key of ['logo', 'favicon', 'tab_title']) {
		t.false(Object.hasOwn(ds, key), `${key} must not be emitted`);
	}
	t.is(ds.subscriptionLevel, SubscriptionLevelEnum.FREE_PLAN);
	t.is(ds.portal_link, saasCompany.portal_link);
});

test('buildFoundCompanyInfoDs (self-hosted, no saas info) has the same shape', (t) => {
	const ds = buildFoundCompanyInfoDs(coreCompany(), null);
	t.deepEqual(ds, {
		id: 'b3363e0b-0101-4bc8-86cd-02516d407b62',
		name: 'Acme',
		is2faEnabled: false,
		show_test_connections: true,
		custom_domain: null,
	});
});

test('buildFoundCompanyFullInfoDs keeps connections/invitations and drops white label too', (t) => {
	const ds = buildFoundCompanyFullInfoDs(coreCompany(), saasCompany, UserRoleEnum.ADMIN);
	t.deepEqual(ds.connections, []);
	t.deepEqual(ds.invitations, []);
	t.is(ds.custom_domain, null);
	t.false(Object.hasOwn(ds, 'logo'));
});
