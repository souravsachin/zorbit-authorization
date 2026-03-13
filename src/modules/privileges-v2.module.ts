import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivilegesV2Controller } from '../controllers/privileges-v2.controller';
import { PrivilegesV2Service } from '../services/privileges-v2.service';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';
import { RolePrivilegeV2 } from '../models/entities/role-privilege-v2.entity';
import { Role } from '../models/entities/role.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivilegeV2, PrivilegeSection, RolePrivilegeV2, Role]),
    EventsModule,
  ],
  controllers: [PrivilegesV2Controller],
  providers: [PrivilegesV2Service],
  exports: [PrivilegesV2Service],
})
export class PrivilegesV2Module {}
