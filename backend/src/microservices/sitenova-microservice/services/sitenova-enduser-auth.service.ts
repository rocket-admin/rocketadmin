import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import {
	SITENOVA_ENDUSER_AUDIENCE,
	SITENOVA_ENDUSER_TOKEN_TTL,
	SitenovaEndUserTokenPayload,
} from '../data-structures/sitenova-site.ds.js';

// Provisions and uses a per-connection HS256 signing key for generated-site end-user (site visitor)
// tokens. The key is stored as a company-scoped UserSecret (encrypted at rest with the app key,
// no master-password layer so it can be decrypted unattended on public requests) and never leaves
// the backend. Rotating/deleting the secret invalidates every token for that one site.
@Injectable()
export class SitenovaEndUserAuthService {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		private readonly _dbContext: IGlobalDatabaseContext,
	) {}

	public async signEndUserToken(connectionId: string, sub: string): Promise<string> {
		const key = await this.getOrCreateSigningKey(connectionId);
		const payload: SitenovaEndUserTokenPayload = { sub, cid: connectionId, aud: SITENOVA_ENDUSER_AUDIENCE };
		return jwt.sign(payload, key, { algorithm: 'HS256', expiresIn: SITENOVA_ENDUSER_TOKEN_TTL });
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

	private secretSlug(connectionId: string): string {
		return `sitenova:enduser-jwt:${connectionId}`;
	}

	private async resolveCompanyId(connectionId: string): Promise<string> {
		const connection = await this._dbContext.connectionRepository.findOne({
			where: { id: connectionId },
			relations: { company: true },
		});
		if (!connection || !connection.company) {
			throw new InternalServerErrorException('Connection has no owning company; cannot manage signing key.');
		}
		return connection.company.id;
	}

	private async getSigningKeyOrNull(connectionId: string): Promise<string | null> {
		const companyId = await this.resolveCompanyId(connectionId);
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
		const companyId = await this.resolveCompanyId(connectionId);
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
