import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivilegeSection } from '../models/entities/privilege-section.entity';
import { PrivilegeV2 } from '../models/entities/privilege-v2.entity';
import { CreatePrivilegeSectionDto } from '../models/dto/create-privilege-section.dto';
import { UpdatePrivilegeSectionDto } from '../models/dto/update-privilege-section.dto';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuthorizationEvents } from '../events/authorization.events';

@Injectable()
export class PrivilegeSectionsService {
  private readonly logger = new Logger(PrivilegeSectionsService.name);

  constructor(
    @InjectRepository(PrivilegeSection)
    private readonly sectionRepository: Repository<PrivilegeSection>,
    @InjectRepository(PrivilegeV2)
    private readonly privilegeV2Repository: Repository<PrivilegeV2>,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * List all privilege sections, ordered by seq_number.
   */
  async findAll(): Promise<PrivilegeSection[]> {
    return this.sectionRepository.find({
      order: { seqNumber: 'ASC', sectionCode: 'ASC' },
    });
  }

  /**
   * Find a single privilege section by ID.
   */
  async findOne(id: string): Promise<PrivilegeSection> {
    const section = await this.sectionRepository.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException(`Privilege section ${id} not found`);
    }
    return section;
  }

  /**
   * Create a new privilege section.
   */
  async create(dto: CreatePrivilegeSectionDto): Promise<PrivilegeSection> {
    // Check for duplicate section_code
    const existing = await this.sectionRepository.findOne({
      where: { sectionCode: dto.sectionCode },
    });
    if (existing) {
      throw new ConflictException(
        `Privilege section with code '${dto.sectionCode}' already exists`,
      );
    }

    const section = this.sectionRepository.create({
      sectionCode: dto.sectionCode,
      sectionLabel: dto.sectionLabel,
      icon: dto.icon || null,
      seqNumber: dto.seqNumber ?? 0,
      visible: dto.visible ?? true,
    });

    await this.sectionRepository.save(section);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_SECTION_CREATED,
      'G',
      'G',
      {
        sectionId: section.id,
        sectionCode: section.sectionCode,
        sectionLabel: section.sectionLabel,
      },
    );

    this.logger.log(
      `Created privilege section ${section.id} (${section.sectionCode})`,
    );

    return section;
  }

  /**
   * Update an existing privilege section.
   */
  async update(
    id: string,
    dto: UpdatePrivilegeSectionDto,
  ): Promise<PrivilegeSection> {
    const section = await this.sectionRepository.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException(`Privilege section ${id} not found`);
    }

    // Check for duplicate section_code if changing
    if (dto.sectionCode !== undefined && dto.sectionCode !== section.sectionCode) {
      const existing = await this.sectionRepository.findOne({
        where: { sectionCode: dto.sectionCode },
      });
      if (existing) {
        throw new ConflictException(
          `Privilege section with code '${dto.sectionCode}' already exists`,
        );
      }
    }

    if (dto.sectionCode !== undefined) section.sectionCode = dto.sectionCode;
    if (dto.sectionLabel !== undefined) section.sectionLabel = dto.sectionLabel;
    if (dto.icon !== undefined) section.icon = dto.icon;
    if (dto.seqNumber !== undefined) section.seqNumber = dto.seqNumber;
    if (dto.visible !== undefined) section.visible = dto.visible;

    await this.sectionRepository.save(section);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_SECTION_UPDATED,
      'G',
      'G',
      {
        sectionId: section.id,
        updatedFields: Object.keys(dto).filter(
          (k) => dto[k as keyof UpdatePrivilegeSectionDto] !== undefined,
        ),
      },
    );

    this.logger.log(`Updated privilege section ${id}`);

    return section;
  }

  /**
   * Delete a privilege section.
   */
  async remove(id: string): Promise<void> {
    const section = await this.sectionRepository.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException(`Privilege section ${id} not found`);
    }

    await this.sectionRepository.remove(section);

    await this.eventPublisher.publish(
      AuthorizationEvents.PRIVILEGE_SECTION_DELETED,
      'G',
      'G',
      { sectionId: id, sectionCode: section.sectionCode },
    );

    this.logger.log(`Deleted privilege section ${id}`);
  }

  /**
   * Assign privileges to a section (update their sectionId).
   */
  async assignPrivileges(
    sectionId: string,
    privilegeIds: string[],
  ): Promise<{ sectionId: string; assigned: string[]; notFound: string[] }> {
    const section = await this.sectionRepository.findOne({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException(`Privilege section ${sectionId} not found`);
    }

    const assigned: string[] = [];
    const notFound: string[] = [];

    for (const privId of privilegeIds) {
      const privilege = await this.privilegeV2Repository.findOne({ where: { id: privId } });
      if (!privilege) {
        notFound.push(privId);
        continue;
      }
      privilege.sectionId = sectionId;
      await this.privilegeV2Repository.save(privilege);
      assigned.push(privId);
    }

    if (assigned.length > 0) {
      await this.eventPublisher.publish(
        AuthorizationEvents.PRIVILEGE_SECTION_UPDATED,
        'G',
        'G',
        {
          sectionId,
          sectionCode: section.sectionCode,
          assignedPrivileges: assigned,
        },
      );
    }

    this.logger.log(
      `Assigned ${assigned.length} privileges to section ${sectionId} (${notFound.length} not found)`,
    );

    return { sectionId, assigned, notFound };
  }

  /**
   * List privileges belonging to a section.
   */
  async findPrivilegesBySection(sectionId: string): Promise<PrivilegeV2[]> {
    const section = await this.sectionRepository.findOne({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException(`Privilege section ${sectionId} not found`);
    }

    return this.privilegeV2Repository.find({
      where: { sectionId },
      order: { seqNumber: 'ASC' },
    });
  }
}
