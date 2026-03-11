import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from '../controllers/roles.controller';
import { RolesService } from '../services/roles.service';
import { HashIdService } from '../services/hash-id.service';
import { Role } from '../models/entities/role.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), EventsModule],
  controllers: [RolesController],
  providers: [RolesService, HashIdService],
  exports: [RolesService],
})
export class RolesModule {}
