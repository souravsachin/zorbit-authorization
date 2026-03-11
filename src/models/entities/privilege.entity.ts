import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RolePrivilege } from './role-privilege.entity';

export enum NamespaceScope {
  GLOBAL = 'G',
  ORGANIZATION = 'O',
  DEPARTMENT = 'D',
  USER = 'U',
}

@Entity('privileges')
export class Privilege {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. PRV-C3D4 */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  /** Machine-readable privilege code, e.g. users.read, roles.manage */
  @Column({ unique: true, length: 100 })
  @Index()
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** The namespace scope at which this privilege applies */
  @Column({
    name: 'namespace_scope',
    type: 'enum',
    enum: NamespaceScope,
    default: NamespaceScope.ORGANIZATION,
  })
  namespaceScope!: NamespaceScope;

  @OneToMany(() => RolePrivilege, (rp) => rp.privilege)
  rolePrivileges!: RolePrivilege[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
