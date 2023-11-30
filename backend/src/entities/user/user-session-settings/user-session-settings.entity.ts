import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_session_settings')
export class UserSessionSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true, type: 'uuid' })
  userId: string;

  @Column({ default: null, type: 'json' })
  userSettings: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
