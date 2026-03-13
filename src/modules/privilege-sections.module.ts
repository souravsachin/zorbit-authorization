import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivilegeSectionsController } from '../controllers/privilege-sections.controller';
import { PrivilegeSectionsService } from '../services/privilege-sections.service';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [TypeOrmModule.forFeature([PrivilegeSection]), EventsModule],
  controllers: [PrivilegeSectionsController],
  providers: [PrivilegeSectionsService],
  exports: [PrivilegeSectionsService],
})
export class PrivilegeSectionsModule {}
