import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatLog } from './entities/chat-log.entity';
import { SearchService } from '../search/search.service';
import { SendMessageDto } from './dto/send-message.dto';
import { LlmService } from './llm.service';
import { UnansweredQuestion } from '../admin/entities/unanswered-question.entity';

@Injectable()
export class ChatService {

  constructor(
    private searchService: SearchService,
    private llmService: LlmService,
    @InjectRepository(ChatLog) private chatLogRepo: Repository<ChatLog>,
    @InjectRepository(UnansweredQuestion) private unansweredRepo: Repository<UnansweredQuestion>,
  ) {}

  async sendMessage(
    dto: SendMessageDto,
    sessionId: string,
    userId: string | null,
    res: any,
  ) {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // FTS 검색 - SearchService 재사용
    const searchResult = await this.searchService.search({
      query: dto.question,
      topK: 5,
    });

    const chunks = searchResult.data.chunks;

    let assistantMessage = '';

    await this.llmService.streamAnswer(
      dto.question,
      chunks,
      [],
      (text) => {
        assistantMessage += text;
        res.write(`event: chunk\ndata: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      },
      async (type) => {
        if (type === 'no_document') {
        await this.unansweredRepo.save({
          question: dto.question,
          reason: 'no_document',
          status: 'unresolved',
        });
      }

      const references = type === 'success'
        ? chunks.map(chunk => ({
            title: chunk.docTitle,
            url: chunk.url,
            section: chunk.heading,
          }))
        : [];

      res.write(`event: done\ndata: ${JSON.stringify({ type: 'done', references })}\n\n`);
      res.end();
      }
    )

    await this.chatLogRepo.save([
      { sessionId, userId, message: dto.question, role: 'user' },
      { sessionId, userId, message: assistantMessage, role: 'assistant' },
    ]);

    // done 이벤트 전송
    const references = chunks.map(chunk => ({
      title: chunk.docTitle,
      url: chunk.url,
      section: chunk.heading,
    }));

    res.write(`event: done\ndata: ${JSON.stringify({ type: 'done', references })}\n\n`);
    res.end();
  }
}