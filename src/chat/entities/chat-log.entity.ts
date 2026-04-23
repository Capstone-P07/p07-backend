import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from './session.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('chat_logs')
export class ChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: true })
  session_id: string;

  @ManyToOne(() => Session, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  role: 'user' | 'assistant';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}