import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RolePrivilege } from './role-privilege.entity';

export enum RoleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. ROL-A1B2 */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** Organization this role belongs to (short hash, e.g. O-92AF) */
  @Column({ name: 'organization_hash_id', length: 20 })
  @Index()
  organizationHashId!: string;

  /** Whether this is a system-defined role (cannot be deleted by users) */
  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @Column({
    type: 'enum',
    enum: RoleStatus,
    default: RoleStatus.ACTIVE,
  })
  status!: RoleStatus;

  @OneToMany(() => RolePrivilege, (rp) => rp.role)
  rolePrivileges!: RolePrivilege[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
