import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomBytes } from 'crypto';
import { PrivilegeSection } from './privilege-section.entity';

/**
 * Extended privilege entity for navigation-driven privilege management.
 * Privileges represent individual menu items with route configurations.
 *
 * This entity uses the table "privileges_v2" to avoid conflicts with the
 * existing "privileges" table. The original privilege entity remains untouched.
 */
@Entity('privileges_v2')
export class PrivilegeV2 {
  /** Short hash identifier, e.g. PRV-A1B2 */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  /** Unique dot-notation privilege code, e.g. "products.configurator.read" */
  @Column({ name: 'privilege_code', type: 'varchar', length: 200, unique: true })
  @Index()
  privilegeCode!: string;

  /** Display label for the privilege */
  @Column({ name: 'privilege_label', type: 'varchar', length: 200 })
  privilegeLabel!: string;

  /** FK to privilege section */
  @Column({ name: 'section_id', type: 'varchar', length: 20 })
  @Index()
  sectionId!: string;

  @ManyToOne(() => PrivilegeSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section!: PrivilegeSection;

  /** Frontend route handlebars template, e.g. "/org/{{org_id}}/products" */
  @Column({ name: 'fe_route_config', type: 'varchar', length: 500, nullable: true })
  feRouteConfig!: string | null;

  /** Backend API path template, e.g. "/api/v1/O/{{org_id}}/products" */
  @Column({ name: 'be_route_config', type: 'varchar', length: 500, nullable: true })
  beRouteConfig!: string | null;

  /** Material Icon name */
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon!: string | null;

  /** Whether this privilege is visible as a menu item */
  @Column({ name: 'visible_in_menu', type: 'boolean', default: true })
  visibleInMenu!: boolean;

  /** Display order within section */
  @Column({ name: 'seq_number', type: 'int', default: 0 })
  seqNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      const hash = randomBytes(2).toString('hex').toUpperCase();
      this.id = `PRV-${hash}`;
    }
  }
}
