import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyController } from '../controllers/policy.controller';
import { PolicyService } from '../services/policy.service';
import { UserRole } from '../models/entities/user-role.entity';
import { Role } from '../models/entities/role.entity';
import { RolePrivilege } from '../models/entities/role-privilege.entity';
import { Privilege } from '../models/entities/privilege.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRole, Role, RolePrivilege, Privilege]),
    EventsModule,
  ],
  controllers: [PolicyController],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
