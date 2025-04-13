import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CompanyInfoEntity } from '../company-info/company-info.entity.js';

@Entity('company_tab_title')
export class CompanyTabTitleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: false, nullable: true })
  text: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToOne((_) => CompanyInfoEntity, (company) => company.tab_title, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  company: Relation<CompanyInfoEntity>;
}
