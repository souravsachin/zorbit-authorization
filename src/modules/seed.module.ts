import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../models/entities/role.entity';
import { Privilege } from '../models/entities/privilege.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { UserRole } from '../models/entities/user-role.entity';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';
import { RolePrivilegeV2 } from '../models/entities/role-privilege-v2.entity';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';
import { SeedController } from '../controllers/seed.controller';
import { SeedService } from '../services/seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Privilege, RolePrivilege, UserRole, PrivilegeV2, RolePrivilegeV2, PrivilegeSection])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
