import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../models/entities/role.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { Privilege } from '../models/entities/privilege.entity';
import { UserRole } from '../models/entities/user-role.entity';
import {
  AuthorizeRequestDto,
  AuthorizeResponseDto,
} from '../models/dto/authorize-request.dto';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuthorizationEvents } from '../events/authorization.events';

/**
 * Core policy evaluation engine.
 * Given a user, action, resource, and namespace context,
 * determines whether the request is allowed or denied.
 *
 * The evaluation flow:
 * 1. Look up user's roles in the given namespace (organization)
 * 2. Collect all privileges from those roles
 * 3. Check if the requested action+resource matches any privilege
 */
@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePrivilege)
    private readonly rolePrivilegeRepository: Repository<RolePrivilege>,
    @InjectRepository(Privilege)
    private readonly privilegeRepository: Repository<Privilege>,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Evaluate an authorization policy decision.
   */
  async evaluate(request: AuthorizeRequestDto): Promise<AuthorizeResponseDto> {
    const startTime = Date.now();

    try {
      // 1. Get all role assignments for the user in the target namespace
      const userRoles = await this.userRoleRepository.find({
        where: {
          userHashId: request.userHashId,
          organizationHashId: request.namespaceId,
        },
      });

      if (userRoles.length === 0) {
        return this.buildResponse(request, false, 'No roles assigned to user in this namespace');
      }

      // 2. Get all Role entities by their hash IDs
      const roleHashIds = userRoles.map((ur) => ur.roleHashId);
      const roles = await this.roleRepository.find({
        where: { hashId: In(roleHashIds), organizationHashId: request.namespaceId },
      });

      if (roles.length === 0) {
        return this.buildResponse(request, false, 'No valid roles found');
      }

      // 3. Get all role-privilege assignments for those roles
      const roleIds = roles.map((r) => r.id);
      const rolePrivileges = await this.rolePrivilegeRepository.find({
        where: { roleId: In(roleIds) },
        relations: ['privilege'],
      });

      if (rolePrivileges.length === 0) {
        return this.buildResponse(request, false, 'No privileges assigned to user roles');
      }

      // 4. Check if any privilege matches the requested resource + action
      const matchingPrivilege = rolePrivileges.find((rp) => {
        const privilege = rp.privilege;
        return this.matchesResourceAction(privilege, request.resource, request.action);
      });

      if (matchingPrivilege) {
        const privilege = matchingPrivilege.privilege;
        const response = this.buildResponse(
          request,
          true,
          `Granted by privilege: ${privilege.name} (${privilege.resource}.${privilege.action})`,
        );
        await this.publishEvaluation(request, response, Date.now() - startTime);
        return response;
      }

      const response = this.buildResponse(
        request,
        false,
        'No matching privilege found for the requested action',
      );
      await this.publishEvaluation(request, response, Date.now() - startTime);
      return response;
    } catch (error) {
      this.logger.error('Policy evaluation failed', error);
      return this.buildResponse(request, false, 'Policy evaluation error');
    }
  }

  /**
   * Check if a privilege matches the requested resource and action.
   * - 'admin' action on matching resource grants all actions
   * - Exact resource + action match
   */
  private matchesResourceAction(
    privilege: Privilege,
    resource: string,
    action: string,
  ): boolean {
    if (privilege.resource !== resource) return false;
    if (privilege.action === 'admin') return true;
    return privilege.action === action;
  }

  private buildResponse(
    request: AuthorizeRequestDto,
    allowed: boolean,
    reason: string,
  ): AuthorizeResponseDto {
    return {
      allowed,
      userHashId: request.userHashId,
      action: request.action,
      resource: request.resource,
      namespace: request.namespace,
      namespaceId: request.namespaceId,
      evaluatedAt: new Date().toISOString(),
      reason,
    };
  }

  private async publishEvaluation(
    request: AuthorizeRequestDto,
    response: AuthorizeResponseDto,
    durationMs: number,
  ): Promise<void> {
    await this.eventPublisher.publish(
      AuthorizationEvents.POLICY_EVALUATED,
      request.namespace,
      request.namespaceId,
      {
        userHashId: request.userHashId,
        action: request.action,
        resource: request.resource,
        allowed: response.allowed,
        reason: response.reason,
        durationMs,
      },
    );
  }
}
