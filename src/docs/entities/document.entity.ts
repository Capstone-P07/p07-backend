import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DocChunk } from './doc-chunk.entity';

@Entity('document')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'indexing' | 'indexed' | 'failed';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;

  @OneToMany(() => DocChunk, (chunk) => chunk.document)
  chunks: DocChunk[];
}