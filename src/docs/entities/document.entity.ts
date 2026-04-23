import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('document')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  source_url: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'indexing' | 'indexed' | 'failed';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}