import {IsString, IsNotEmpty, IsOptional, IsUUID} from 'class-validator';

export class SearchQueryDto{
    @IsString()
    @IsNotEmpty()
    query: string;

    @IsOptional()
    @IsUUID()
    sessionId?: string;

    @IsOptional()
    topK?: number = 5;
}