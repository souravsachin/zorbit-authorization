import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRolesController } from '../controllers/user-roles.controller';
import { UserRolesService } from '../services/user-roles.service';
import { UserRole } from '../models/entities/user-role.entity';
import { Role } from '../models/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, Role])],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}
