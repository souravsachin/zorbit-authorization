import { Controller, Post, Delete, Query, Logger, UseGuards } from '@nestjs/common';
import { SeedService } from '../services/seed.service';
import { SeedAuthGuard } from '../middleware/seed-auth.guard';
import { ZorbitPrivilegeGuard } from '../middleware/zorbit-privilege.guard';
import { RequirePrivileges } from '../middleware/decorators';

@Controller('api/v1/G/authorization')
@UseGuards(SeedAuthGuard, ZorbitPrivilegeGuard)
@RequirePrivileges('platform.seed.execute')
export class SeedController {
  private readonly logger = new Logger(SeedController.name);

  constructor(private readonly seedService: SeedService) {}

  /**
   * POST /api/v1/G/authorization/seed
   * System minimum seed — 15 standard roles + privileges. Idempotent.
   */
  @Post('seed')
  async seedSystem() {
    const seeded = await this.seedService.seedSystem();
    return { success: true, seeded };
  }

  /**
   * POST /api/v1/G/authorization/seed/demo
   * Demo data — assign demo users to org_admin roles. Idempotent.
   */
  @Post('seed/demo')
  async seedDemo(): Promise<{ success: boolean; seeded: { roles: number; privileges: number } }> {
    const seeded = await this.seedService.seedDemo();
    return { success: true, seeded };
  }

  /**
   * DELETE /api/v1/G/authorization/seed/demo
   * Flush demo user-role assignments.
   */
  @Delete('seed/demo')
  async flushDemo(): Promise<{ success: boolean; flushed: { roles: number; privileges: number } }> {
    const flushed = await this.seedService.flushDemo();
    return { success: true, flushed };
  }

  /**
   * DELETE /api/v1/G/authorization/seed/all?confirm=yes
   * Flush all roles, privileges, and assignments. Requires ?confirm=yes.
   */
  @Delete('seed/all')
  async flushAll(
    @Query('confirm') confirm: string,
  ): Promise<{ success: boolean; flushed: { roles: number; privileges: number } }> {
    const flushed = await this.seedService.flushAll(confirm);
    return { success: true, flushed };
  }
}
