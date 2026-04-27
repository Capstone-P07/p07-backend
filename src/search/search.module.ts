import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchLog } from './entities/search-log.entity';
import { SearchService } from './search.service';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
   imports: [
    TypeOrmModule.forFeature([SearchLog]),
    RedisModule,
  ],
  controllers: [SearchController],
  providers: [SearchService]
})
export class SearchModule {}
