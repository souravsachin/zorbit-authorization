import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivilegesController } from '../controllers/privileges.controller';
import { PrivilegesService } from '../services/privileges.service';
import { HashIdService } from '../services/hash-id.service';
import { Privilege } from '../models/entities/privilege.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { Role } from '../models/entities/role.entity';
import { UserRole } from '../models/entities/user-role.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Privilege, RolePrivilege, Role, UserRole]),
    EventsModule,
  ],
  controllers: [PrivilegesController],
  providers: [PrivilegesService, HashIdService],
  exports: [PrivilegesService],
})
export class PrivilegesModule {}
