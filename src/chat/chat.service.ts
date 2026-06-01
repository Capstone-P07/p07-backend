import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatLog } from './entities/chat-log.entity';
import { SearchService } from '../search/search.service';
import { LlmService } from './llm.service';
import { UnansweredQuestion } from '../admin/entities/unanswered-question.entity';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class ChatService {

  constructor(
    private searchService: SearchService,
    private llmService: LlmService,
    @InjectRepository(ChatLog) private chatLogRepo: Repository<ChatLog>,
    @InjectRepository(UnansweredQuestion) private unansweredRepo: Repository<UnansweredQuestion>,
  ) {}

  sendMessage(
    question: string,
    sessionId: string,
    userId: string | null,
  ): Observable<any> {
    const subject = new Subject<any>();
    
    (async () => {
      try {
        const normalizedQuery = await this.llmService.normalizeQuestion(question);

        const searchResult = await this.searchService.search({
          query: normalizedQuery,
          topK: 5,
          sessionId,
        }, { includeContext: true });

        const allChunks = searchResult.data.chunks;

        const chunks = allChunks.length > 0
        ? allChunks.filter(
          (chunk: any) => chunk.score >= allChunks[0].score * 0.3 //상대 임계값 적용
        ) : [];

        const previousLogs = await this.chatLogRepo.find({
          where: { sessionId },
          order: { createdAt: 'ASC' },
          take: 10,
        });
        const previousMessages = previousLogs.map(log => ({
          role: log.role as 'user' | 'assistant',
          content: log.message,
        }));

        let assistantMessage = '';

        await this.llmService.streamAnswer(
          question,
          chunks,
          previousMessages,
          (text) => {
            assistantMessage += text;
            subject.next({data: { type: 'chunk', text }});
          },
          async (type) => {

            const references = type === 'success'
              ? chunks.map(chunk => ({
                  title: chunk.docTitle,
                  url: chunk.url,
                  section: chunk.heading,
                }))
              : [];

            await this.chatLogRepo.save([
              { sessionId, userId, message: question, role: 'user' },
              { sessionId, userId, message: assistantMessage, referencesJson: references, role: 'assistant', responseType: type },
            ]);

            if (type === 'no_document') {
              
              const existing = await this.unansweredRepo.findOne({
                where: { question: normalizedQuery }
              });

              if (existing) {
                await this.unansweredRepo.update(existing.id, {
                  frequency: existing.frequency + 1,
                  updatedAt: new Date(),
                });
              } else {
                await this.unansweredRepo.save({
                  question: normalizedQuery,
                  reason: 'no_document',
                  status: 'unresolved',
                  frequency: 1,
                });
              }
            }

            subject.next({data: {type: 'done', references}});
            subject.complete();
          },
        );
      } catch(err) {
        subject.next({data: {type: 'chunk', text:'오류가 발생했습니다. 다시 시도해주세요.'}});
        subject.next({data: {type: 'done', references: [] }});
        subject.complete();
      }
    })();
    return subject.asObservable();
  }
}
