import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('chat_logs')
export class ChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string;

  @ManyToOne(() => Session, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'references_json', type: 'jsonb', nullable: true })
  referencesJson: Array<{
    chunkId: number;
    docTitle: string;
    heading: string;
    url: string;
  }> | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  role: 'user' | 'assistant';

  @Column({ name: 'response_type', type: 'varchar', length: 20, nullable: true })
  responseType: 'success' | 'out_of_scope' | 'no_document' | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}