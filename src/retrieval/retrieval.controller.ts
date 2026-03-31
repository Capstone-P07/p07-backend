import { Controller } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';

@Controller('search')
export class RetrievalController {
  constructor(private readonly retrievalService: RetrievalService) {}
}
