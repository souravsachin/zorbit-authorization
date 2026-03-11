import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyService } from '../src/services/policy.service';
import { UserRole } from '../src/models/entities/user-role.entity';
import { Role, RoleStatus } from '../src/models/entities/role.entity';
import { RolePrivilege } from '../src/models/entities/role-privilege.entity';
import { Privilege, NamespaceScope } from '../src/models/entities/privilege.entity';
import { EventPublisherService } from '../src/events/event-publisher.service';
import { AuthorizeRequestDto } from '../src/models/dto/authorize-request.dto';

describe('PolicyService', () => {
  let service: PolicyService;
  let userRoleRepository: jest.Mocked<Repository<UserRole>>;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let rolePrivilegeRepository: jest.Mocked<Repository<RolePrivilege>>;
  let privilegeRepository: jest.Mocked<Repository<Privilege>>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockRole: Partial<Role> = {
    id: 'role-uuid-1',
    hashId: 'ROL-A1B2',
    name: 'Admin',
    organizationHashId: 'O-92AF',
    status: RoleStatus.ACTIVE,
  };

  const mockPrivilege: Partial<Privilege> = {
    id: 'priv-uuid-1',
    hashId: 'PRV-C3D4',
    code: 'users.read',
    namespaceScope: NamespaceScope.ORGANIZATION,
  };

  const mockUserRole: Partial<UserRole> = {
    id: 'ur-uuid-1',
    userHashId: 'U-81F3',
    roleHashId: 'ROL-A1B2',
    organizationHashId: 'O-92AF',
  };

  const mockRolePrivilege: Partial<RolePrivilege> = {
    id: 'rp-uuid-1',
    roleId: 'role-uuid-1',
    privilegeId: 'priv-uuid-1',
    privilege: mockPrivilege as Privilege,
  };

  const baseRequest: AuthorizeRequestDto = {
    userHashId: 'U-81F3',
    action: 'users.read',
    resource: 'users',
    namespace: 'O',
    namespaceId: 'O-92AF',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        {
          provide: getRepositoryToken(UserRole),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(RolePrivilege),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Privilege),
          useValue: { find: jest.fn() },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PolicyService>(PolicyService);
    userRoleRepository = module.get(getRepositoryToken(UserRole)) as jest.Mocked<Repository<UserRole>>;
    roleRepository = module.get(getRepositoryToken(Role)) as jest.Mocked<Repository<Role>>;
    rolePrivilegeRepository = module.get(getRepositoryToken(RolePrivilege)) as jest.Mocked<Repository<RolePrivilege>>;
    privilegeRepository = module.get(getRepositoryToken(Privilege)) as jest.Mocked<Repository<Privilege>>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluate', () => {
    it('should deny when user has no roles', async () => {
      userRoleRepository.find.mockResolvedValue([]);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No roles assigned');
    });

    it('should allow when user has matching privilege', async () => {
      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([mockRole as Role]);
      rolePrivilegeRepository.find.mockResolvedValue([mockRolePrivilege as RolePrivilege]);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('users.read');
    });

    it('should allow when user has wildcard privilege', async () => {
      const wildcardPrivilege: Partial<Privilege> = {
        ...mockPrivilege,
        code: 'users.*',
      };
      const wildcardRolePrivilege: Partial<RolePrivilege> = {
        ...mockRolePrivilege,
        privilege: wildcardPrivilege as Privilege,
      };

      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([mockRole as Role]);
      rolePrivilegeRepository.find.mockResolvedValue([wildcardRolePrivilege as RolePrivilege]);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(true);
    });

    it('should deny when privilege action does not match', async () => {
      const writePrivilege: Partial<Privilege> = {
        ...mockPrivilege,
        code: 'users.write',
      };
      const writeRolePrivilege: Partial<RolePrivilege> = {
        ...mockRolePrivilege,
        privilege: writePrivilege as Privilege,
      };

      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([mockRole as Role]);
      rolePrivilegeRepository.find.mockResolvedValue([writeRolePrivilege as RolePrivilege]);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.evaluate({
        ...baseRequest,
        action: 'users.delete',
      });

      expect(result.allowed).toBe(false);
    });

    it('should deny when no roles are found for the hash IDs', async () => {
      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([]);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No valid roles found');
    });

    it('should deny when roles have no privileges', async () => {
      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([mockRole as Role]);
      rolePrivilegeRepository.find.mockResolvedValue([]);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No privileges assigned');
    });

    it('should include evaluation metadata in response', async () => {
      userRoleRepository.find.mockResolvedValue([]);

      const result = await service.evaluate(baseRequest);

      expect(result.userHashId).toBe('U-81F3');
      expect(result.action).toBe('users.read');
      expect(result.resource).toBe('users');
      expect(result.namespace).toBe('O');
      expect(result.namespaceId).toBe('O-92AF');
      expect(result.evaluatedAt).toBeDefined();
    });

    it('should respect namespace scope hierarchy — global privilege grants org access', async () => {
      const globalPrivilege: Partial<Privilege> = {
        ...mockPrivilege,
        code: 'users.read',
        namespaceScope: NamespaceScope.GLOBAL,
      };
      const globalRolePrivilege: Partial<RolePrivilege> = {
        ...mockRolePrivilege,
        privilege: globalPrivilege as Privilege,
      };

      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([mockRole as Role]);
      rolePrivilegeRepository.find.mockResolvedValue([globalRolePrivilege as RolePrivilege]);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(true);
    });

    it('should deny when user-scoped privilege is used for org-scoped request', async () => {
      const userScopedPrivilege: Partial<Privilege> = {
        ...mockPrivilege,
        code: 'users.read',
        namespaceScope: NamespaceScope.USER,
      };
      const userScopedRolePrivilege: Partial<RolePrivilege> = {
        ...mockRolePrivilege,
        privilege: userScopedPrivilege as Privilege,
      };

      userRoleRepository.find.mockResolvedValue([mockUserRole as UserRole]);
      roleRepository.find.mockResolvedValue([mockRole as Role]);
      rolePrivilegeRepository.find.mockResolvedValue([userScopedRolePrivilege as RolePrivilege]);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.evaluate(baseRequest);

      expect(result.allowed).toBe(false);
    });
  });
});
