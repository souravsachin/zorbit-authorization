import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  Unique,
} from 'typeorm';
import { RolePrivilege } from './role-privilege.entity';

@Entity('privileges')
@Unique(['name', 'organizationHashId'])
export class Privilege {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. PRV-C3D4 */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  /** Human-readable privilege name, unique per organization */
  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** The resource this privilege controls, e.g. 'users', 'roles', 'reports' */
  @Column({ length: 100 })
  resource!: string;

  /** The action allowed on the resource: read, write, delete, admin */
  @Column({ length: 50 })
  action!: string;

  /** Organization this privilege belongs to (short hash, e.g. O-92AF) */
  @Column({ name: 'organization_hash_id', length: 20 })
  @Index()
  organizationHashId!: string;

  @OneToMany(() => RolePrivilege, (rp) => rp.privilege)
  rolePrivileges!: RolePrivilege[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
