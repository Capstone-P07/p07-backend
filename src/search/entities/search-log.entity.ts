import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('search_logs')
export class SearchLog {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ type: 'text' })
  query: string;

  @Column({ name: 'matched_chunks_json', type: 'jsonb', nullable: true })
  matchedChunksJson: object | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}