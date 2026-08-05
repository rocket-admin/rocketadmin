import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { appConfig } from '../../../shared/config/app-config.js';
import {
	SITENOVA_ENDUSER_AUDIENCE,
	SITENOVA_ENDUSER_TOKEN_TTL,
	SitenovaEndUserTokenPayload,
} from '../data-structures/sitenova-site.ds.js';

// Provisions and uses a per-connection HS256 signing key for generated-site end-user (site visitor)
// tokens, never exposed outside the backend.
//
// When the connection belongs to a company (SaaS), the key is a company-scoped UserSecret —
// encrypted at rest with the app key, no master-password layer so it decrypts unattended on public
// requests; rotating/deleting it invalidates every token for that site. When the connection has NO
// company (self-hosted / single-tenant), we deterministically DERIVE the key from the platform
// secret per connection instead — UserSecret requires a companyId, so storage isn't an option there.
@Injectable()
export class SitenovaEndUserAuthService {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly _dbContext: IGlobalDatabaseContext,
	) {}

	// `uid` (the users-table row primary key) is the basis for row-level authorization in the
	// universal-backend runtime (plan 13). It is optional here: the core's own register/login sites
	// are being retired to universal-backend, so the core keeps issuing uid-less tokens, and the
	// universal-backend verifier accepts them through its grace window. Verification is symmetric
	// regardless — same key, same audience — so a uid-bearing token from either service validates on
	// the other during cutover.
	public async signEndUserToken(connectionId: string, sub: string, uid?: string): Promise<string> {
		const key = await this.getOrCreateSigningKey(connectionId);
		const payload: SitenovaEndUserTokenPayload = { sub, cid: connectionId, aud: SITENOVA_ENDUSER_AUDIENCE };
		if (uid !== undefined) {
			payload.uid = uid;
		}
		return jwt.sign(payload, key, {
			algorithm: 'HS256',
			expiresIn: SITENOVA_ENDUSER_TOKEN_TTL as jwt.SignOptions['expiresIn'],
		});
	}

	// Returns the decoded payload when the token is a valid end-user token bound to this connection,
	// or null otherwise. Never throws on an invalid token (the guard turns null into a 401).
	public async verifyEndUserToken(connectionId: string, token: string): Promise<SitenovaEndUserTokenPayload | null> {
		const key = await this.getSigningKeyOrNull(connectionId);
		if (!key) {
			return null;
		}
		try {
			const decoded = jwt.verify(token, key, {
				algorithms: ['HS256'],
				audience: SITENOVA_ENDUSER_AUDIENCE,
			}) as SitenovaEndUserTokenPayload;
			if (decoded.cid !== connectionId) {
				return null;
			}
			return decoded;
		} catch {
			return null;
		}
	}

	// Exposes the signing key to the internal (microservice-JWT) connection-credentials endpoint,
	// so the universal-backend service can sign/verify the same end-user tokens locally.
	public async getEndUserSigningKey(connectionId: string): Promise<string> {
		return await this.getOrCreateSigningKey(connectionId);
	}

	private secretSlug(connectionId: string): string {
		return `sitenova:enduser-jwt:${connectionId}`;
	}

	private async resolveCompanyIdOrNull(connectionId: string): Promise<string | null> {
		const connection = await this._dbContext.connectionRepository.findOne({
			where: { id: connectionId },
			relations: { company: true },
		});
		return connection?.company?.id ?? null;
	}

	// Deterministic per-connection key for connections with no company. HMAC of the platform secret
	// keeps it distinct from the raw JWT_SECRET and isolated per connection, with no storage needed.
	private deriveConnectionKey(connectionId: string): string {
		const base = appConfig.auth.jwtSecret;
		if (!base) {
			throw new InternalServerErrorException('No signing secret configured for SiteNova end-user tokens.');
		}
		return crypto.createHmac('sha256', base).update(`sitenova:enduser:${connectionId}`).digest('hex');
	}

	private async getSigningKeyOrNull(connectionId: string): Promise<string | null> {
		const companyId = await this.resolveCompanyIdOrNull(connectionId);
		if (!companyId) {
			return this.deriveConnectionKey(connectionId);
		}
		const secret = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(
			this.secretSlug(connectionId),
			companyId,
		);
		if (!secret) {
			return null;
		}
		return Encryptor.decryptData(secret.encryptedValue);
	}

	private async getOrCreateSigningKey(connectionId: string): Promise<string> {
		const companyId = await this.resolveCompanyIdOrNull(connectionId);
		if (!companyId) {
			return this.deriveConnectionKey(connectionId);
		}
		const slug = this.secretSlug(connectionId);
		const existing = await this._dbContext.userSecretRepository.findSecretBySlugAndCompanyId(slug, companyId);
		if (existing) {
			return Encryptor.decryptData(existing.encryptedValue);
		}
		const key = crypto.randomBytes(32).toString('hex');
		const secret = this._dbContext.userSecretRepository.create({
			slug,
			encryptedValue: Encryptor.encryptData(key),
			companyId,
			expiresAt: null,
			masterEncryption: false,
			masterHash: null,
		});
		await this._dbContext.userSecretRepository.save(secret);
		return key;
	}
}
