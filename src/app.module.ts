import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZorbitAuthModule } from '@zorbit-platform/sdk-node';
import { RolesModule } from './modules/roles.module';
import { PrivilegesModule } from './modules/privileges.module';
import { UserRolesModule } from './modules/user-roles.module';
import { PolicyModule } from './modules/policy.module';
import { EventsModule } from './modules/events.module';
import { PrivilegeSectionsModule } from './modules/privilege-sections.module';
import { PrivilegesV2Module } from './modules/privileges-v2.module';
import { SeedModule } from './modules/seed.module';
import { HealthController } from './controllers/health.controller';
import { ModuleAnnouncementService } from './events/module-announcement.service';
import { Role } from './models/entities/role.entity';
import { Privilege } from './models/entities/privilege.entity';
import { RolePrivilege } from './models/entities/role-privilege.entity';
import { UserRole } from './models/entities/user-role.entity';
import { PrivilegeSection } from './models/entities/privilege-section.entity';
import { PrivilegeV2 } from './models/entities/privilege-v2.entity';
import { RolePrivilegeV2 } from './models/entities/role-privilege-v2.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // EPIC-9 / SDK 0.5.0 — single-line auth wiring. Replaces per-feature
    // PassportModule.register() + JwtModule.registerAsync() + local
    // JwtStrategy. Provides Reflector, ZorbitJwtStrategy and the three
    // Zorbit guards (Jwt/Namespace/Privilege) globally. Resolves the
    // cycle-105 boot error:
    //   - "[ZorbitJwtStrategy] cannot resolve JWT secret"
    // Canonical reference: 02_repos/zorbit-pii-vault/src/app.module.ts
    // and 02_repos/zorbit-identity/src/app.module.ts.
    ZorbitAuthModule.forRoot({
      jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5433),
        database: config.get<string>('DATABASE_NAME', 'zorbit_authorization'),
        username: config.get<string>('DATABASE_USER', 'zorbit'),
        password: config.get<string>('DATABASE_PASSWORD', 'zorbit_dev'),
        entities: [Role, Privilege, RolePrivilege, UserRole, PrivilegeSection, PrivilegeV2, RolePrivilegeV2],
        synchronize: config.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    RolesModule,
    PrivilegesModule,
    UserRolesModule,
    PolicyModule,
    EventsModule,
    PrivilegeSectionsModule,
    PrivilegesV2Module,
    SeedModule,
  ],
  controllers: [HealthController],
  providers: [ModuleAnnouncementService],
})
export class AppModule {}
