import {
	BeforeInsert,
	BeforeUpdate,
	Column,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
	Relation,
} from 'typeorm';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { ConnectionEntity } from '../connection/connection.entity.js';

@Entity('agent')
export class AgentEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	token: string;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	createdAt: Date;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	updatedAt: Date;

	private _tokenChanged = false;

	setToken(token: string): void {
		this.token = token;
		this._tokenChanged = true;
	}

	@BeforeInsert()
	encryptToken(): void {
		this.token = Encryptor.hashDataHMAC(this.token);
		this._tokenChanged = false;
	}

	@BeforeUpdate()
	updateTimestampAndEncryptToken(): void {
		this.updatedAt = new Date();
		if (this._tokenChanged) {
			this.token = Encryptor.hashDataHMAC(this.token);
			this._tokenChanged = false;
		}
	}

	@OneToOne(
		(_) => ConnectionEntity,
		(connection) => connection.agent,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn()
	connection: Relation<ConnectionEntity>;
}
