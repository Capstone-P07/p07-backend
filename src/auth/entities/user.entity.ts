import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  pwd_hash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}