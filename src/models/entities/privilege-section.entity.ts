import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { randomBytes } from 'crypto';

/**
 * Privilege sections represent menu groupings in the navigation.
 * Each section contains multiple privileges (menu items).
 */
@Entity('privilege_sections')
export class PrivilegeSection {
  /** Short hash identifier, e.g. SEC-A1B2 */
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  /** Unique section code, e.g. "identity", "admin", "products" */
  @Column({ name: 'section_code', type: 'varchar', length: 100, unique: true })
  @Index()
  sectionCode!: string;

  /** Display label for the section */
  @Column({ name: 'section_label', type: 'varchar', length: 200 })
  sectionLabel!: string;

  /** Material Icon name */
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon!: string | null;

  /** Display order */
  @Column({ name: 'seq_number', type: 'int', default: 0 })
  seqNumber!: number;

  /** Whether this section is visible in the menu */
  @Column({ type: 'boolean', default: true })
  visible!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      const hash = randomBytes(2).toString('hex').toUpperCase();
      this.id = `SEC-${hash}`;
    }
  }
}
