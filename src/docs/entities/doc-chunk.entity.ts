import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('doc_chunks')
export class DocChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  doc_id: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doc_id' })
  document: Document;

  @Column({ type: 'int', nullable: true })
  chunk_index: number;

  @Column({ type: 'text', nullable: true })
  heading: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'tsvector', nullable: true, select: false })
  fts_vector: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}