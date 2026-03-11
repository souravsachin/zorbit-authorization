import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Maps users to roles within an organization.
 * References user and role by hash IDs (no FK to identity DB — service isolation).
 */
@Entity('user_roles')
@Unique(['userHashId', 'roleHashId', 'organizationHashId'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** User short hash ID, e.g. U-81F3 */
  @Column({ name: 'user_hash_id', length: 20 })
  @Index()
  userHashId!: string;

  /** Role short hash ID, e.g. ROL-A1B2 */
  @Column({ name: 'role_hash_id', length: 20 })
  @Index()
  roleHashId!: string;

  /** Organization short hash ID, e.g. O-92AF */
  @Column({ name: 'organization_hash_id', length: 20 })
  @Index()
  organizationHashId!: string;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;
}
