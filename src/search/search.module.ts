import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchLog } from './entities/search-log.entity';
import { SearchService } from './search.service';

@Module({
   imports: [
    TypeOrmModule.forFeature([SearchLog]),
  ],
  controllers: [SearchController],
  providers: [SearchService]
})
export class SearchModule {}
