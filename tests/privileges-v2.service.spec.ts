import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrivilegesV2Service } from '../src/services/privileges-v2.service';
import { PrivilegeV2 } from '../src/models/entities/privilege-v2.entity';
import { PrivilegeSection } from '../src/models/entities/privilege-section.entity';
import { RolePrivilegeV2 } from '../src/models/entities/role-privilege-v2.entity';
import { Role } from '../src/models/entities/role.entity';
import { EventPublisherService } from '../src/events/event-publisher.service';

describe('PrivilegesV2Service', () => {
  let service: PrivilegesV2Service;
  let privilegeRepository: jest.Mocked<Repository<PrivilegeV2>>;
  let sectionRepository: jest.Mocked<Repository<PrivilegeSection>>;
  let rolePrivilegeRepository: jest.Mocked<Repository<RolePrivilegeV2>>;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockSection: Partial<PrivilegeSection> = {
    id: 'SEC-A1B2',
    sectionCode: 'products',
    sectionLabel: 'Products',
    icon: 'inventory_2',
    seqNumber: 10,
    visible: true,
  };

  const mockPrivilege: Partial<PrivilegeV2> = {
    id: 'PRV-C3D4',
    privilegeCode: 'products.configurator.read',
    privilegeLabel: 'Product Configurator (Read)',
    sectionId: 'SEC-A1B2',
    section: mockSection as PrivilegeSection,
    feRouteConfig: '/org/{{org_id}}/products/configurator',
    beRouteConfig: '/api/v1/O/{{org_id}}/products/configurator',
    icon: 'settings',
    visibleInMenu: true,
    seqNumber: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockRole: Partial<Role> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    hashId: 'ROL-A1B2',
    name: 'Admin',
    organizationHashId: 'O-92AF',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivilegesV2Service,
        {
          provide: getRepositoryToken(PrivilegeV2),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PrivilegeSection),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RolePrivilegeV2),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PrivilegesV2Service>(PrivilegesV2Service);
    privilegeRepository = module.get(getRepositoryToken(PrivilegeV2)) as jest.Mocked<Repository<PrivilegeV2>>;
    sectionRepository = module.get(getRepositoryToken(PrivilegeSection)) as jest.Mocked<Repository<PrivilegeSection>>;
    rolePrivilegeRepository = module.get(getRepositoryToken(RolePrivilegeV2)) as jest.Mocked<Repository<RolePrivilegeV2>>;
    roleRepository = module.get(getRepositoryToken(Role)) as jest.Mocked<Repository<Role>>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all privileges with sections', async () => {
      privilegeRepository.find.mockResolvedValue([mockPrivilege as PrivilegeV2]);

      const result = await service.findAll();

      expect(privilegeRepository.find).toHaveBeenCalledWith({
        relations: ['section'],
        order: { sectionId: 'ASC', seqNumber: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].privilegeCode).toBe('products.configurator.read');
    });
  });

  describe('findOne', () => {
    it('should return a privilege by ID with section', async () => {
      privilegeRepository.findOne.mockResolvedValue(mockPrivilege as PrivilegeV2);

      const result = await service.findOne('PRV-C3D4');

      expect(result.id).toBe('PRV-C3D4');
      expect(result.section.sectionCode).toBe('products');
    });

    it('should throw NotFoundException if privilege not found', async () => {
      privilegeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('PRV-0000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a privilege and publish event', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection as PrivilegeSection);
      privilegeRepository.findOne
        .mockResolvedValueOnce(null) // no duplicate code
        .mockResolvedValueOnce(mockPrivilege as PrivilegeV2); // reload with section
      privilegeRepository.create.mockReturnValue(mockPrivilege as PrivilegeV2);
      privilegeRepository.save.mockResolvedValue(mockPrivilege as PrivilegeV2);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.create({
        privilegeCode: 'products.configurator.read',
        privilegeLabel: 'Product Configurator (Read)',
        sectionId: 'SEC-A1B2',
        feRouteConfig: '/org/{{org_id}}/products/configurator',
        beRouteConfig: '/api/v1/O/{{org_id}}/products/configurator',
        icon: 'settings',
      });

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.privilege.created',
        'G',
        'G',
        expect.objectContaining({ privilegeCode: 'products.configurator.read' }),
      );
      expect(result.privilegeCode).toBe('products.configurator.read');
    });

    it('should throw NotFoundException if section does not exist', async () => {
      sectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          privilegeCode: 'test.priv',
          privilegeLabel: 'Test',
          sectionId: 'SEC-0000',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if privilege_code already exists', async () => {
      sectionRepository.findOne.mockResolvedValue(mockSection as PrivilegeSection);
      privilegeRepository.findOne.mockResolvedValue(mockPrivilege as PrivilegeV2);

      await expect(
        service.create({
          privilegeCode: 'products.configurator.read',
          privilegeLabel: 'Duplicate',
          sectionId: 'SEC-A1B2',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a privilege and publish event', async () => {
      privilegeRepository.findOne
        .mockResolvedValueOnce({ ...mockPrivilege } as PrivilegeV2) // find
        .mockResolvedValueOnce({ ...mockPrivilege, privilegeLabel: 'Updated' } as PrivilegeV2); // reload
      privilegeRepository.save.mockResolvedValue({
        ...mockPrivilege,
        privilegeLabel: 'Updated',
      } as PrivilegeV2);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.update('PRV-C3D4', {
        privilegeLabel: 'Updated',
      });

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.privilege.updated',
        'G',
        'G',
        expect.objectContaining({ privilegeId: 'PRV-C3D4' }),
      );
    });

    it('should throw NotFoundException if privilege not found', async () => {
      privilegeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('PRV-0000', { privilegeLabel: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate section exists when changing sectionId', async () => {
      privilegeRepository.findOne.mockResolvedValueOnce(mockPrivilege as PrivilegeV2);
      sectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('PRV-C3D4', { sectionId: 'SEC-9999' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a privilege and publish event', async () => {
      privilegeRepository.findOne.mockResolvedValue(mockPrivilege as PrivilegeV2);
      privilegeRepository.remove.mockResolvedValue(mockPrivilege as PrivilegeV2);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.remove('PRV-C3D4');

      expect(privilegeRepository.remove).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.privilege.deleted',
        'G',
        'G',
        expect.objectContaining({ privilegeId: 'PRV-C3D4' }),
      );
    });

    it('should throw NotFoundException if privilege not found', async () => {
      privilegeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('PRV-0000')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignToRole', () => {
    it('should assign privileges to a role', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(null) // UUID lookup fails
        .mockResolvedValueOnce(mockRole as Role); // hashId lookup succeeds
      privilegeRepository.find.mockResolvedValue([mockPrivilege as PrivilegeV2]);
      rolePrivilegeRepository.findOne.mockResolvedValue(null); // not already assigned
      rolePrivilegeRepository.create.mockReturnValue({
        roleId: mockRole.id,
        privilegeId: 'PRV-C3D4',
      } as RolePrivilegeV2);
      rolePrivilegeRepository.save.mockResolvedValue({} as RolePrivilegeV2);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.assignToRole('ROL-A1B2', ['PRV-C3D4']);

      expect(result.assigned).toContain('PRV-C3D4');
      expect(result.skipped).toHaveLength(0);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.role_privilege.assigned',
        'G',
        'G',
        expect.objectContaining({ roleId: 'ROL-A1B2' }),
      );
    });

    it('should skip already assigned privileges', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRole as Role);
      privilegeRepository.find.mockResolvedValue([mockPrivilege as PrivilegeV2]);
      rolePrivilegeRepository.findOne.mockResolvedValue({ id: 'existing' } as RolePrivilegeV2);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.assignToRole('ROL-A1B2', ['PRV-C3D4']);

      expect(result.assigned).toHaveLength(0);
      expect(result.skipped).toContain('PRV-C3D4');
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignToRole('ROL-0000', ['PRV-C3D4']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if privilege not found', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRole as Role);
      privilegeRepository.find.mockResolvedValue([]); // none found

      await expect(
        service.assignToRole('ROL-A1B2', ['PRV-FAKE']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeFromRole', () => {
    it('should revoke a privilege from a role', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRole as Role);
      rolePrivilegeRepository.findOne.mockResolvedValue({
        id: 'rp-uuid',
        roleId: mockRole.id,
        privilegeId: 'PRV-C3D4',
      } as RolePrivilegeV2);
      rolePrivilegeRepository.remove.mockResolvedValue({} as RolePrivilegeV2);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.revokeFromRole('ROL-A1B2', 'PRV-C3D4');

      expect(rolePrivilegeRepository.remove).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'authorization.role_privilege.revoked',
        'G',
        'G',
        expect.objectContaining({ roleId: 'ROL-A1B2', privilegeId: 'PRV-C3D4' }),
      );
    });

    it('should throw NotFoundException if assignment does not exist', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRole as Role);
      rolePrivilegeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revokeFromRole('ROL-A1B2', 'PRV-C3D4'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByRole', () => {
    it('should return privileges for a role', async () => {
      roleRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRole as Role);
      rolePrivilegeRepository.find.mockResolvedValue([
        {
          id: 'rp-uuid',
          roleId: mockRole.id,
          privilegeId: 'PRV-C3D4',
          privilege: mockPrivilege as PrivilegeV2,
          createdAt: new Date(),
        } as RolePrivilegeV2,
      ]);

      const result = await service.findByRole('ROL-A1B2');

      expect(result).toHaveLength(1);
      expect(result[0].privilegeCode).toBe('products.configurator.read');
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.findByRole('ROL-0000')).rejects.toThrow(NotFoundException);
    });
  });
});
