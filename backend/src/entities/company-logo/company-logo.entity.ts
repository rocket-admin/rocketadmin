import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';

@Entity('company_logo')
export class CompanyLogoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bytea', nullable: true })
  logo: Buffer;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToOne((_) => CompanyInfoEntity, (company) => company.logo, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  company: Relation<CompanyInfoEntity>;
}
