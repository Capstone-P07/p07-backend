import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatLog } from './entities/chat-log.entity';
import { SearchService } from '../search/search.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {

  constructor(
    private searchService: SearchService,
    @InjectRepository(ChatLog) private chatLogRepo: Repository<ChatLog>,
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

    // LLM 목업 스트리밍 (나중에 OpenAI로 교체)
    const mockAnswer = chunks.length > 0
      ? '관련 문서를 찾았습니다. 현재 LLM 연동 준비 중입니다.'
      : '죄송합니다. 관련 문서를 찾지 못했습니다.';

    const words = mockAnswer.split(' ');
    for (const word of words) {
      res.write(`event: chunk\ndata: ${JSON.stringify({ type: 'chunk', text: word + ' ' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 100)); // 스트리밍 효과
    }

    // chat_logs 저장
    const assistantMessage = mockAnswer;

    await this.chatLogRepo.save([
      { sessionId, userId, message: dto.question, role: 'user' },
      { sessionId, userId, message: assistantMessage, role: 'assistant' },
    ]);

    // done 이벤트 전송
    const references = chunks.map(chunk => ({
      title: chunk.heading ?? chunk.doc_title,
      url: chunk.source_url,
      section: chunk.heading,
    }));

    res.write(`event: done\ndata: ${JSON.stringify({ type: 'done', references })}\n\n`);
    res.end();
  }
}