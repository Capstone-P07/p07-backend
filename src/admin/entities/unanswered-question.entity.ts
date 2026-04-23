import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Document } from '../../docs/entities/document.entity';

@Entity('unanswered_questions')
export class UnansweredQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  reason: 'out_of_scope' | 'no_document';

  @Column({ type: 'varchar', length: 20, default: 'unresolved', nullable: true })
  status: 'unresolved' | 'resolved' | 'dismissed';

  @Column({ type: 'int', default: 1 })
  frequency: number;

  @Column({ type: 'int', nullable: true })
  resolved_by: number;

  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedDocument: Document;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}