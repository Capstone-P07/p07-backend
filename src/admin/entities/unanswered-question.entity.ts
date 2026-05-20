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

  @Column({ name: 'resolved_by', type: 'int', nullable: true })
  resolvedBy: number;

  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedDocument: Document;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;
}