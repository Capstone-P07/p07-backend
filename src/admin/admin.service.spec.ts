import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AdminService } from './admin.service';
import { UnansweredQuestion } from './entities/unanswered-question.entity';
import { Feedback } from './entities/feedback.entity';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { SearchLog } from '../search/entities/search-log.entity';
import { Document } from '../docs/entities/document.entity';

describe('AdminService', () => {
  let service: AdminService;
  let unansweredRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
  };
  let documentRepo: { exist: jest.Mock; count: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    unansweredRepo = {
      findOne: jest.fn(),
      save: jest.fn((x) => Promise.resolve(x)),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };
    documentRepo = {
      exist: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(UnansweredQuestion), useValue: unansweredRepo },
        { provide: getRepositoryToken(Feedback), useValue: { count: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(ChatLog), useValue: { count: jest.fn() } },
        { provide: getRepositoryToken(SearchLog), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Document), useValue: documentRepo },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  it('marks an unanswered question as resolved with a linked document', async () => {
    const item = {
      id: 3,
      status: 'unresolved',
      resolvedBy: null,
      updatedAt: new Date('2026-05-01T00:00:00Z'),
    };
    unansweredRepo.findOne.mockResolvedValueOnce(item);
    documentRepo.exist.mockResolvedValueOnce(true);

    const result = await service.updateUnansweredStatus(3, { status: 'resolved', resolvedBy: 12 });

    expect(documentRepo.exist).toHaveBeenCalledWith({ where: { id: 12 } });
    expect(unansweredRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, status: 'resolved', resolvedBy: 12 }),
    );
    expect(result).toEqual({
      id: 3,
      status: 'resolved',
      resolvedBy: 12,
      updatedAt: item.updatedAt,
    });
  });

  it('rejects resolved status without a linked document id', async () => {
    unansweredRepo.findOne.mockResolvedValueOnce({ id: 3, status: 'unresolved', resolvedBy: null });

    await expect(
      service.updateUnansweredStatus(3, { status: 'resolved' }),
    ).rejects.toThrow(BadRequestException);
    expect(documentRepo.exist).not.toHaveBeenCalled();
    expect(unansweredRepo.save).not.toHaveBeenCalled();
  });

  it('clears resolvedBy when dismissed or reopened', async () => {
    const item = { id: 3, status: 'resolved', resolvedBy: 12, updatedAt: new Date() };
    unansweredRepo.findOne.mockResolvedValueOnce(item);

    const result = await service.updateUnansweredStatus(3, { status: 'unresolved', resolvedBy: null });

    expect(unansweredRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unresolved', resolvedBy: null }),
    );
    expect(result.resolvedBy).toBeNull();
  });

  it('throws NotFoundException for missing unanswered question', async () => {
    unansweredRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.updateUnansweredStatus(999, { status: 'dismissed' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('supports latest sorting in unanswered list', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    unansweredRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getUnansweredList(2, 10, 'unresolved', 'latest');

    expect(qb.where).toHaveBeenCalledWith('uq.status = :status', { status: 'unresolved' });
    expect(qb.orderBy).toHaveBeenCalledWith('uq.updatedAt', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('uq.createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
  });
});
