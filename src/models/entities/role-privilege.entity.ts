import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Role } from './role.entity';
import { Privilege } from './privilege.entity';

/**
 * Junction table linking roles to privileges.
 * Each row represents a privilege assigned to a role.
 */
@Entity('role_privileges')
@Unique(['roleId', 'privilegeId'])
export class RolePrivilege {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_id' })
  @Index()
  roleId!: string;

  @Column({ name: 'privilege_id' })
  @Index()
  privilegeId!: string;

  @ManyToOne(() => Role, (role) => role.rolePrivileges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Privilege, (privilege) => privilege.rolePrivileges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'privilege_id' })
  privilege!: Privilege;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;
}
