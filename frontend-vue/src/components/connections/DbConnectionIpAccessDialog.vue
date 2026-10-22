<script setup lang="ts">
// Port of connect-db/db-connection-ip-access-dialog: before a direct connection is added, asks the
// user to let Rocketadmin's IP through — step-by-step for AWS, Azure and Google Cloud, or the
// GRANT / pg_hba.conf commands for a self-hosted PostgreSQL, MySQL or Oracle. Closes with
// 'confirmed' on "I've given access".
import { computed } from 'vue';
import AppDialog from '@/components/dialog/AppDialog.vue';
import AppIpAddressButton from '@/components/shared/AppIpAddressButton.vue';
import { UiButton, UiIconButton } from '@/components/ui';
import { useDialogRef } from '@/composables/useDialog';
import { copyToClipboard } from '@/lib/clipboard';
import { useNotificationsStore } from '@/stores/notifications';
import { type DbConnectionIpAccessDialogData, IP_ACCESS_CONFIRMED } from './dialogs';
import { IP_ACCESS_DOCS_LINKS, ROCKETADMIN_IP } from './provider';

const props = defineProps<{ data: DbConnectionIpAccessDialogData }>();

const dialogRef = useDialogRef<string>();
const notifications = useNotificationsStore();

const db = computed(() => props.data.db);
const schema = computed(() => db.value.schema || 'public');
const docsLink = computed(() => (props.data.provider ? IP_ACCESS_DOCS_LINKS[props.data.provider] : undefined));

const postgresGrants = computed(() => [
	`GRANT CONNECT ON DATABASE "${db.value.database}" TO "${db.value.username}";`,
	`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema.value}" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${db.value.username}";`,
	`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "${db.value.username}";`,
]);
// As in Angular, the copied grants use the schema in the last line too, while the shown one says "public".
const postgresGrantsCopy = computed(() =>
	[
		postgresGrants.value[0],
		postgresGrants.value[1],
		`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema.value}" TO "${db.value.username}";`,
	].join('\n'),
);
const pgHbaLine = `host    all    all    ${ROCKETADMIN_IP}/32    trust`;
const pgHbaCopy = `host    all         all         ${ROCKETADMIN_IP}/32    trust`;
const mysqlGrant = computed(
	() =>
		`GRANT ALL PRIVILEGES ON ${db.value.database} TO \`${db.value.username}\`@\`${ROCKETADMIN_IP}\` IDENTIFIED BY \`<password>\` WITH GRANT OPTION;`,
);
const oracleCommand = 'EXEC DBMS_XDB.SETLISTENERLOCALACCESS(FALSE);';

async function copyCommand(text: string) {
	if (await copyToClipboard(text)) notifications.showSuccessSnackbar('Command was copied to clipboard.');
}
</script>

<template>
	<AppDialog title="Give access to our IP address" size="lg">
		<p class="ip-access__text">
			Please make sure our servers are able to access your database. Rocketadmin uses the IP address
			<AppIpAddressButton :ip="ROCKETADMIN_IP" /> for all outbound requests.
		</p>

		<div v-if="data.provider === 'amazon'" class="ip-access__provider">
			<strong>Set up AWS's VPC security groups</strong>
			<ol class="ip-access__rules">
				<li>Open the Amazon RDS <strong>console</strong>.</li>
				<li>
					In the navigation pane, choose <strong>Databases</strong> and open your database overview. On the tab
					<strong>Connectivity &amp; security</strong> find the section
					<strong>Security&nbsp;/&nbsp;VPC security groups</strong>.
				</li>
				<li>Open your VPC security group overview and then click <strong>Edit inbound rules</strong>.</li>
				<li>
					Click <strong>Add Rule</strong>, and enter the following information: <br>
					<strong>Type</strong> — your db type; <br>
					<strong>Source</strong> — select <strong>Custom</strong> and enter
					<AppIpAddressButton :ip="`${ROCKETADMIN_IP}/32`" />.
				</li>
				<li>Click <strong>Save</strong>.</li>
			</ol>
		</div>

		<div v-if="data.provider === 'azure'" class="ip-access__provider">
			<strong>Set up Azure's firewall rules</strong>
			<ol class="ip-access__rules">
				<li>Open your database overview and select <strong>Networking</strong> from the navigation pane.</li>
				<li>
					In the <strong>Connectivity method</strong> you have to have
					<strong>Public access (allowed IP addresses)</strong>.
				</li>
				<li>
					Add a rule to the Firewall rules table. Enter any Firewall rule name, Start IP address:
					<AppIpAddressButton :ip="ROCKETADMIN_IP" />, End IP address: <AppIpAddressButton :ip="ROCKETADMIN_IP" />.
				</li>
				<li>Click <strong>Save</strong>.</li>
			</ol>
		</div>

		<div v-if="data.provider === 'google'" class="ip-access__provider">
			<strong>Set up Google Cloud's authorized networks</strong>
			<ol class="ip-access__rules">
				<li>Open your instance overview and select <strong>Connections</strong> from the navigation pane.</li>
				<li>
					Tick the <strong>Public IP</strong> checkbox and click <strong>Add network</strong> in
					<strong>Authorized networks</strong> section.
				</li>
				<li>
					Enter any name and <AppIpAddressButton :ip="ROCKETADMIN_IP" /> IP address for a
					<strong>New network</strong>.
				</li>
				<li>Click <strong>Done</strong> and then <strong>Save</strong> to update the instance.</li>
			</ol>
		</div>

		<template v-if="data.provider === null">
			<div v-if="db.type === 'postgres'" class="ip-access__provider" data-testid="ip-access-postgres">
				Give privileges to a user:
				<div class="ip-access__snippet">
					<code class="ip-access__code">
						<pre v-for="line in postgresGrants" :key="line">{{ line }}</pre>
					</code>
					<UiIconButton icon="content_copy" label="Copy the command." @click="copyCommand(postgresGrantsCopy)" />
				</div>

				Add the following line in file pg_hba.conf (/var/lib/pgsql/data/pg_hba.conf for Linux).

				<div class="ip-access__snippet">
					<code class="ip-access__code"><pre>{{ pgHbaLine }}</pre></code>
					<UiIconButton icon="content_copy" label="Copy the command." @click="copyCommand(pgHbaCopy)" />
				</div>
			</div>

			<div v-if="db.type === 'mysql'" class="ip-access__provider" data-testid="ip-access-mysql">
				Give privileges to user and allow to connect:
				<div class="ip-access__snippet">
					<code class="ip-access__code"><pre>{{ mysqlGrant }}</pre></code>
					<UiIconButton icon="content_copy" label="Copy the command." @click="copyCommand(mysqlGrant)" />
				</div>

				and then

				<div class="ip-access__snippet">
					<code class="ip-access__code"><pre>FLUSH PRIVILEGES;</pre></code>
					<UiIconButton icon="content_copy" label="Copy the command." @click="copyCommand('FLUSH PRIVILEGES;')" />
				</div>
			</div>

			<div v-if="db.type === 'oracledb'" class="ip-access__provider" data-testid="ip-access-oracledb">
				<p class="ip-access__text">
					Start the SQL PLUS Command Line and connect to the database as user SYSTEM. Provide the SYSTEM password
					that you assigned upon installation (Windows) or configuration (Linux) of Oracle Database XE. Run the
					following command:
				</p>
				<div class="ip-access__snippet">
					<code class="ip-access__code"><pre>{{ oracleCommand }}</pre></code>
					<UiIconButton icon="content_copy" label="Copy the command." @click="copyCommand(oracleCommand)" />
				</div>
			</div>
		</template>

		<template #footer>
			<UiButton v-if="data.provider === null" variant="secondary" @click="dialogRef.close()">Cancel</UiButton>
			<UiButton v-if="docsLink" variant="ghost" :href="docsLink" target="_blank" rel="noopener">Setup guide</UiButton>
			<UiButton @click="dialogRef.close(IP_ACCESS_CONFIRMED)">I've given access</UiButton>
		</template>
	</AppDialog>
</template>

<style scoped>
.ip-access__text {
	margin: 0 0 var(--space-5);
}

.ip-access__provider {
	margin-bottom: var(--space-4);
}

.ip-access__rules {
	margin: 0;
	padding: var(--space-4);
	line-height: var(--leading-relaxed);
}

.ip-access__snippet {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	margin: var(--space-2) 0;
}

.ip-access__code {
	flex-grow: 1;
	min-width: 0;
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	font-family: var(--font-mono);
	font-size: var(--text-sm);
}

.ip-access__code pre {
	margin: 0;
	white-space: break-spaces;
	font-family: inherit;
}
</style>
