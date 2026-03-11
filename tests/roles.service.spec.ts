import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RolesService } from '../src/services/roles.service';
import { Role, RoleStatus } from '../src/models/entities/role.entity';
import { HashIdService } from '../src/services/hash-id.service';
import { EventPublisherService } from '../src/events/event-publisher.service';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let hashIdService: jest.Mocked<HashIdService>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockRole: Partial<Role> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    hashId: 'ROL-A1B2',
    name: 'Admin',
    description: 'Administrator role',
    organizationHashId: 'O-92AF',
    isSystem: false,
    status: RoleStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: HashIdService,
          useValue: { generate: jest.fn() },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get(getRepositoryToken(Role)) as jest.Mocked<Repository<Role>>;
    hashIdService = module.get(HashIdService) as jest.Mocked<HashIdService>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByOrganization', () => {
    it('should return roles filtered by organization', async () => {
      roleRepository.find.mockResolvedValue([mockRole as Role]);

      const result = await service.findAllByOrganization('O-92AF');

      expect(roleRepository.find).toHaveBeenCalledWith({
        where: { organizationHashId: 'O-92AF' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].hashId).toBe('ROL-A1B2');
      expect(result[0].name).toBe('Admin');
    });
  });

  describe('findOne', () => {
    it('should return a role by hashId and org', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);

      const result = await service.findOne('O-92AF', 'ROL-A1B2');

      expect(result.hashId).toBe('ROL-A1B2');
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('O-92AF', 'ROL-0000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a role and publish event', async () => {
      roleRepository.findOne.mockResolvedValue(null); // no duplicate
      hashIdService.generate.mockReturnValue('ROL-NEW1');
      roleRepository.create.mockReturnValue({ ...mockRole, hashId: 'ROL-NEW1' } as Role);
      roleRepository.save.mockResolvedValue({ ...mockRole, hashId: 'ROL-NEW1' } as Role);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.create('O-92AF', {
        name: 'Editor',
        description: 'Can edit content',
      });

      expect(hashIdService.generate).toHaveBeenCalledWith('ROL');
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.role.created',
        'O',
        'O-92AF',
        expect.objectContaining({ roleHashId: 'ROL-NEW1' }),
      );
      expect(result.hashId).toBe('ROL-NEW1');
    });

    it('should throw ConflictException if role name already exists in org', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);

      await expect(
        service.create('O-92AF', { name: 'Admin' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a role and publish event', async () => {
      roleRepository.findOne.mockResolvedValue({ ...mockRole } as Role);
      roleRepository.save.mockResolvedValue({
        ...mockRole,
        name: 'Super Admin',
      } as Role);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.update('O-92AF', 'ROL-A1B2', {
        name: 'Super Admin',
      });

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.role.updated',
        'O',
        'O-92AF',
        expect.objectContaining({ roleHashId: 'ROL-A1B2' }),
      );
    });

    it('should throw ForbiddenException for system roles', async () => {
      roleRepository.findOne.mockResolvedValue({
        ...mockRole,
        isSystem: true,
      } as Role);

      await expect(
        service.update('O-92AF', 'ROL-A1B2', { name: 'Changed' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove role and publish event', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);
      roleRepository.remove.mockResolvedValue(mockRole as Role);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.remove('O-92AF', 'ROL-A1B2');

      expect(roleRepository.remove).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.role.deleted',
        'O',
        'O-92AF',
        { roleHashId: 'ROL-A1B2' },
      );
    });

    it('should throw ForbiddenException for system roles', async () => {
      roleRepository.findOne.mockResolvedValue({
        ...mockRole,
        isSystem: true,
      } as Role);

      await expect(service.remove('O-92AF', 'ROL-A1B2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if role not in org', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('O-92AF', 'ROL-0000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
