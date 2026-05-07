import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatLog } from '../../chat/entities/chat-log.entity';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chat_logs_id', type: 'int' })
  chatLogId: number;

  @ManyToOne(() => ChatLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_logs_id' })
  chatLog: ChatLog;

  @Column({ type: 'varchar', length: 10, nullable: true })
  rating: 'thumb_up' | 'thumb_down';

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
