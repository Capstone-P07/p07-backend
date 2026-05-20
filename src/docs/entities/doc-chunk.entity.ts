import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';

// 이 테이블은 init.sql 소유:
//   * `fts_vector` 컬럼과 GIN 인덱스, 그리고 mecab-ko 트리거(`doc_chunks_fts_update`)는
//     TypeORM 이 이해하지 못하는 구조(USING GIN, tsvector_update_trigger 등)다.
//   * 동기화에 맡기면 GIN 인덱스가 drop 되고 BTREE 로 재생성 시도되어 FTS 성능이 무너진다.
// 따라서 DocChunk 테이블은 TypeORM schema synchronize 에서 제외. 스키마 변경은 init.sql 에서만.
@Entity('doc_chunks', { synchronize: false })
export class DocChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doc_id', type: 'int' })
  docId: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doc_id' })
  document: Document;

  @Column({ name: 'chunk_index', type: 'int', nullable: true })
  chunkIndex: number;

  @Column({ type: 'text', nullable: true })
  heading: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  // fts_vector is owned by the DB trigger `doc_chunks_fts_update` (public.korean config).
  // The backend never reads, writes, or updates this column.
  @Column({ name: 'fts_vector', type: 'tsvector', nullable: true, select: false, insert: false, update: false })
  ftsVector: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}