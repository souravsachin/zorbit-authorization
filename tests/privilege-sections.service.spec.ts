import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrivilegeSectionsService } from '../src/services/privilege-sections.service';
import { PrivilegeSection } from '../src/models/entities/privilege-section.entity';
import { EventPublisherService } from '../src/events/event-publisher.service';

describe('PrivilegeSectionsService', () => {
  let service: PrivilegeSectionsService;
  let sectionRepository: jest.Mocked<Repository<PrivilegeSection>>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockSection: Partial<PrivilegeSection> = {
    id: 'SEC-A1B2',
    sectionCode: 'products',
    sectionLabel: 'Products',
    icon: 'inventory_2',
    seqNumber: 10,
    visible: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivilegeSectionsService,
        {
          provide: getRepositoryToken(PrivilegeSection),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PrivilegeSectionsService>(PrivilegeSectionsService);
    sectionRepository = module.get(getRepositoryToken(PrivilegeSection)) as jest.Mocked<Repository<PrivilegeSection>>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all sections ordered by seq_number', async () => {
      sectionRepository.find.mockResolvedValue([mockSection as PrivilegeSection]);

      const result = await service.findAll();

      expect(sectionRepository.find).toHaveBeenCalledWith({
        order: { seqNumber: 'ASC', sectionCode: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].sectionCode).toBe('products');
    });
  });

  describe('findOne', () => {
    it('should return a section by ID', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection as PrivilegeSection);

      const result = await service.findOne('SEC-A1B2');

      expect(result.id).toBe('SEC-A1B2');
      expect(result.sectionCode).toBe('products');
    });

    it('should throw NotFoundException if section not found', async () => {
      sectionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('SEC-0000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a section and publish event', async () => {
      sectionRepository.findOne.mockResolvedValue(null); // no duplicate
      sectionRepository.create.mockReturnValue(mockSection as PrivilegeSection);
      sectionRepository.save.mockResolvedValue(mockSection as PrivilegeSection);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.create({
        sectionCode: 'products',
        sectionLabel: 'Products',
        icon: 'inventory_2',
        seqNumber: 10,
      });

      expect(sectionRepository.create).toHaveBeenCalledWith({
        sectionCode: 'products',
        sectionLabel: 'Products',
        icon: 'inventory_2',
        seqNumber: 10,
        visible: true,
      });
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.privilege_section.created',
        'G',
        'G',
        expect.objectContaining({ sectionCode: 'products' }),
      );
      expect(result.sectionCode).toBe('products');
    });

    it('should throw ConflictException if section_code already exists', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection as PrivilegeSection);

      await expect(
        service.create({ sectionCode: 'products', sectionLabel: 'Products' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a section and publish event', async () => {
      sectionRepository.findOne.mockResolvedValue({ ...mockSection } as PrivilegeSection);
      sectionRepository.save.mockResolvedValue({
        ...mockSection,
        sectionLabel: 'Updated Products',
      } as PrivilegeSection);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.update('SEC-A1B2', {
        sectionLabel: 'Updated Products',
      });

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.privilege_section.updated',
        'G',
        'G',
        expect.objectContaining({ sectionId: 'SEC-A1B2' }),
      );
    });

    it('should throw NotFoundException if section not found', async () => {
      sectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('SEC-0000', { sectionLabel: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new section_code already exists', async () => {
      // First call: find section to update (exists)
      // Second call: check for duplicate section_code (exists)
      sectionRepository.findOne
        .mockResolvedValueOnce({ ...mockSection, sectionCode: 'old' } as PrivilegeSection)
        .mockResolvedValueOnce(mockSection as PrivilegeSection);

      await expect(
        service.update('SEC-A1B2', { sectionCode: 'products' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a section and publish event', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection as PrivilegeSection);
      sectionRepository.remove.mockResolvedValue(mockSection as PrivilegeSection);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.remove('SEC-A1B2');

      expect(sectionRepository.remove).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.privilege_section.deleted',
        'G',
        'G',
        expect.objectContaining({ sectionId: 'SEC-A1B2' }),
      );
    });

    it('should throw NotFoundException if section not found', async () => {
      sectionRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('SEC-0000')).rejects.toThrow(NotFoundException);
    });
  });
});
