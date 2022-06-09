import {
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('table')
export class TableEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;
}
