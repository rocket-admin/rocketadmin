import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mock')
export class MockEntity {

  @PrimaryGeneratedColumn()
  integerGenerated: number;

  @Column()
  integerField: number;

  @Column()
  textField: string;

  @Column()
  booleanField: boolean;

}
