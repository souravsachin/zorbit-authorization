import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRolesController, UserPrivilegesController } from '../controllers/user-roles.controller';
import { UserRolesService } from '../services/user-roles.service';
import { UserRole } from '../models/entities/user-role.entity';
import { Role } from '../models/entities/role.entity';
import { RolePrivilegeV2 } from '../models/entities/role-privilege-v2.entity';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Role, RolePrivilegeV2, PrivilegeV2])],
  controllers: [UserRolesController, UserPrivilegesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}
