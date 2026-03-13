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
import { PrivilegeV2 } from './privilege-v2.entity';

/**
 * Junction table linking roles to v2 privileges (navigation-driven).
 * Each row represents a privilege assigned to a role.
 */
@Entity('role_privileges_v2')
@Unique(['roleId', 'privilegeId'])
export class RolePrivilegeV2 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_id' })
  @Index()
  roleId!: string;

  @Column({ name: 'privilege_id', type: 'varchar', length: 20 })
  @Index()
  privilegeId!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => PrivilegeV2, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'privilege_id' })
  privilege!: PrivilegeV2;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
