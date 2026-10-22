<script setup lang="ts">
// Port of frontend/src/app/components/login. Email first: "Next" looks up the user's companies; one
// company reveals the password at once, several show a company picker. SaaS (outside a customer's
// custom domain) adds Google (GSI button + One Tap) and GitHub sign-in beside the form; a custom
// domain or a self-hosted install asks for email and password straight away. A temporary sign-in
// response swaps the form for the 2FA code step. A successful sign-in is redirected by the auth
// store (startSession → /connections-list).
//
// `?error=` from the GitHub OAuth redirect is shown as a dismissible page alert.
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import AuthHeader from '@/components/auth/AuthHeader.vue';
import { trackAuthEvent } from '@/components/auth/analytics';
import { isValidEmail } from '@/components/auth/validity';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UiButton, UiField, UiInput, UiSelect, UiSkeleton } from '@/components/ui';
import { useGoogleSignIn } from '@/composables/useGoogleSignIn';
import { environment } from '@/environment';
import { AlertActionType, AlertType } from '@/models/alert';
import type { ExistingAuthUser } from '@/models/user';
import { type AuthResponse, type CompanyOption, useAuthStore } from '@/stores/auth';
import { useCompanyStore } from '@/stores/company';
import { useNotificationsStore } from '@/stores/notifications';
import { emailErrors } from '@/validators/email.validator';

const ERRORS: Record<string, string> = {
	'No_user_registered_with_this_GitHub_account.': 'No user registered with this GitHub account.',
	'GitHub_login_failed._Please_contact_our_support_team.': 'GitHub login failed. Please contact our support team.',
};

// Served from ../frontend/src/assets until the cutover (see README); a bound src keeps Vite from
// trying to bundle it.
const GITHUB_ICON_URL = '/assets/icons/github.svg';

const auth = useAuthStore();
const company = useCompanyStore();
const notifications = useNotificationsStore();
const route = useRoute();
const googleSignIn = useGoogleSignIn();

const isSaas = environment.saas;
const isCustomDomain = isSaas && company.isCustomDomain();
/** The two-column layout with the Google and GitHub buttons. */
const hasSocialLogin = isSaas && !isCustomDomain;

const user = reactive<ExistingAuthUser>({ email: '', password: '', companyId: '' });
const userCompanies = ref<CompanyOption[] | null>(null);
const isLoadingUserCompanies = ref(false);
const authCode = ref('');
const submitting = ref(false);
const isPasswordFieldShown = ref(false);
const is2FAShown = ref(false);
/** Angular's `loginForm.form.pristine`: nothing has been typed yet. */
const dirty = ref(false);
const emailTouched = ref(false);
const googleButton = ref<HTMLDivElement | null>(null);

const showPassword = computed(() => isPasswordFieldShown.value || Boolean(user.companyId) || isCustomDomain);
const emailError = computed(() => (emailErrors(user.email) ? 'Invalid email format.' : undefined));
const formInvalid = computed(() => !isValidEmail(user.email) || (showPassword.value && !user.password));
const companyOptions = computed(() =>
	(userCompanies.value ?? []).map((option) => ({ value: option.id, label: option.name })),
);

onMounted(() => {
	const error = route.query.error;
	if (typeof error === 'string' && error) {
		notifications.showAlert(AlertType.Error, ERRORS[error] || error, [
			{ type: AlertActionType.Button, caption: 'Dismiss', action: () => notifications.dismissAlert() },
		]);
	}

	if (hasSocialLogin) {
		googleSignIn.mount(googleButton.value, (credential) => {
			auth
				.loginWithGoogle(credential)
				.then((response) => {
					if (response.isTemporary) is2FAShown.value = true;
					trackAuthEvent('Login: google login success');
				})
				.catch(() => {});
		});
	}
});

function onSubmit() {
	if ((user.companyId || isCustomDomain) && user.password) loginUser();
	else requestUserCompanies();
}

async function requestUserCompanies() {
	isLoadingUserCompanies.value = true;
	try {
		const companies = await auth.fetchUserCompanies(user.email);
		trackAuthEvent('Login: companies is received', { count: companies.length });
		userCompanies.value = companies;
		if (companies.length === 1 && companies[0]) {
			isPasswordFieldShown.value = true;
			user.companyId = companies[0].id;
		}
	} catch {
		// The store has shown the error.
	} finally {
		isLoadingUserCompanies.value = false;
	}
}

async function loginUser() {
	submitting.value = true;
	let response: AuthResponse;
	try {
		response = await auth.loginUser({ ...user });
	} catch {
		trackAuthEvent('Login: login unsuccessful');
		return;
	} finally {
		submitting.value = false;
	}
	if (response.isTemporary) is2FAShown.value = true;
	trackAuthEvent('Login: login success');
}

function loginWithGithub() {
	auth.loginWithGithub();
	trackAuthEvent('Login: github login redirect');
	trackAuthEvent('Login: login with github is clicked');
}

async function loginWith2FA() {
	submitting.value = true;
	try {
		await auth.loginWith2FA(authCode.value);
		trackAuthEvent('Login: login with 2fa success');
	} catch {
		trackAuthEvent('Login: login with 2fa unsuccessful');
	} finally {
		submitting.value = false;
	}
}

function onEmailInput(value: string) {
	user.email = value;
	dirty.value = true;
}

function onPasswordInput(value: string) {
	user.password = value;
	dirty.value = true;
}
</script>

<template>
	<div class="login">
		<AppAlert class="login__alert" />

		<div class="login__page">
			<form
				v-show="!is2FAShown"
				:class="['login__form', hasSocialLogin ? 'login__form--social' : 'login__form--native']"
				novalidate
				@submit.prevent="onSubmit"
			>
				<AuthHeader greeting="Welcome back to" class="login__header">
					<template v-if="!userCompanies && !isCustomDomain">
						To log in, please start by entering your email address and click next to continue.
					</template>
					<template v-else-if="userCompanies && userCompanies.length > 1 && !isCustomDomain">
						Please select the company or organization you wish to log into and click next to continue. <br>
						Don’t see your company? Try logging in with Google or GitHub if that’s how you signed up.
					</template>
				</AuthHeader>

				<div class="login__fields">
					<UiField label="Email" :error="emailTouched ? emailError : undefined" required class="login__email">
						<UiInput
							type="email"
							name="email"
							placeholder="Email"
							autocomplete="email"
							data-testid="login-email-input"
							:model-value="user.email"
							@update:model-value="onEmailInput"
							@change="trackAuthEvent('Login: email is changed')"
							@blur="emailTouched = true"
						/>
					</UiField>

					<UiSkeleton v-if="isLoadingUserCompanies" shape="control" height="2.75rem" class="login__loader" />

					<UiField v-if="userCompanies && userCompanies.length > 1" label="Company" class="login__companies">
						<UiSelect
							:model-value="user.companyId || null"
							:options="companyOptions"
							placeholder="Company"
							data-testid="login-company-select"
							@update:model-value="user.companyId = typeof $event === 'string' ? $event : ''"
						/>
					</UiField>

					<UiField v-if="showPassword" label="Password" required class="login__password">
						<UiInput
							type="password"
							name="password"
							placeholder="Password"
							autocomplete="current-password"
							data-testid="login-password-input"
							:model-value="user.password"
							@update:model-value="onPasswordInput"
							@change="trackAuthEvent('Login: password is changed')"
						/>
					</UiField>
				</div>

				<template v-if="hasSocialLogin">
					<div class="login__divider"><span class="login__divider-label">or</span></div>

					<div class="login__social">
						<div
							ref="googleButton"
							class="login__google"
							data-testid="login-google-button"
							@click="trackAuthEvent('Login: login with google is clicked')"
						/>
						<UiButton
							variant="secondary"
							block
							class="login__github"
							data-testid="login-github-button"
							@click="loginWithGithub"
						>
							<template #leading>
								<img :src="GITHUB_ICON_URL" alt="" class="login__github-icon">
							</template>
							Continue with GitHub
						</UiButton>
					</div>
				</template>

				<div class="login__actions">
					<UiButton
						v-if="!user.companyId && !isCustomDomain"
						type="submit"
						variant="secondary"
						class="login__submit"
						data-testid="login-next-button"
						:disabled="submitting || user.email === ''"
					>
						{{ submitting ? 'Submitting' : 'Next' }}
					</UiButton>

					<UiButton
						v-if="showPassword"
						type="submit"
						class="login__submit"
						data-testid="login-button"
						:disabled="submitting || formInvalid || !dirty"
						@click="trackAuthEvent('Login: login is clicked')"
					>
						{{ submitting ? 'Submitting' : 'Log in' }}
					</UiButton>

					<RouterLink to="/forget-password" class="login__link" data-testid="forgot-password-link">
						Reset password
					</RouterLink>
				</div>
			</form>

			<form v-if="is2FAShown" class="login__otp" @submit.prevent="loginWith2FA">
				<h2 class="login__otp-title">Enter 2nd factor code</h2>
				<UiField label="Enter the code from your authenticator">
					<UiInput
						v-model="authCode"
						name="code"
						autocomplete="one-time-code"
						inputmode="numeric"
						data-testid="login-otp-input"
					/>
				</UiField>
				<UiButton type="submit" :disabled="submitting" data-testid="login-otp-button">Verify</UiButton>
			</form>
		</div>
	</div>
</template>

<style scoped>
.login {
	position: relative;
	min-height: calc(100vh - var(--header-height) - var(--footer-height));
	padding: var(--space-4);
}

.login__alert {
	margin-bottom: var(--space-4);
}

.login__page {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: inherit;
}

.login__form--native {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: clamp(22.5rem, 30%, 37.5rem);
}

/* Email column | "or" divider | Google + GitHub column, header and actions spanning all three. */
.login__form--social {
	display: grid;
	grid-template-columns: 22.5rem var(--space-12) 22.5rem;
	grid-template-areas:
		'header header header'
		'fields divider social'
		'actions actions actions';
	justify-items: center;
}

.login__header {
	grid-area: header;
}

.login__fields {
	grid-area: fields;
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	width: 100%;
}

.login__social {
	grid-area: social;
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	width: 100%;
}

.login__google {
	min-height: var(--space-10);
}

.login__github-icon {
	width: 1.25rem;
	height: 1.25rem;
}

.login__divider {
	grid-area: divider;
	position: relative;
	align-self: stretch;
	width: 1px;
	margin: var(--space-2) 0;
	background: var(--color-line);
}

.login__divider-label {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	padding: var(--space-1) var(--space-4);
	font-size: var(--text-sm);
	color: var(--color-muted);
	background: var(--color-paper);
}

.login__actions {
	grid-area: actions;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-4);
	width: 100%;
	margin-top: var(--space-10);
}

.login__submit {
	width: 22.5rem;
	max-width: 100%;
}

.login__link {
	margin-top: var(--space-8);
	color: var(--color-accent);
	text-decoration: none;
}

.login__link:hover {
	text-decoration: underline;
}

.login__otp {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	width: 25rem;
	max-width: 100%;
}

.login__otp-title {
	margin: 0 0 var(--space-4);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	text-align: center;
	color: var(--color-ink);
}

@media (width <= 600px) {
	.login {
		padding: 0;
	}

	.login__page {
		justify-content: flex-start;
	}

	/* One column; the column wrappers dissolve so their children follow Angular's mobile order:
	   fields, actions, divider, Google, GitHub, link. */
	.login__form--social,
	.login__form--native {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-10) 9vw;
	}

	.login__actions {
		display: contents;
	}

	.login__submit {
		order: 4;
		width: 100%;
	}

	.login__divider {
		order: 5;
		align-self: stretch;
		width: 100%;
		height: 1px;
		margin: var(--space-6) 0 var(--space-2);
	}

	.login__social {
		order: 6;
	}

	.login__link {
		order: 9;
		align-self: center;
	}
}
</style>
