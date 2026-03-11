import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RolesModule } from './modules/roles.module';
import { PrivilegesModule } from './modules/privileges.module';
import { UserRolesModule } from './modules/user-roles.module';
import { PolicyModule } from './modules/policy.module';
import { EventsModule } from './modules/events.module';
import { JwtStrategy } from './middleware/jwt.strategy';
import { Role } from './models/entities/role.entity';
import { Privilege } from './models/entities/privilege.entity';
import { RolePrivilege } from './models/entities/role-privilege.entity';
import { UserRole } from './models/entities/user-role.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
        entities: [Role, Privilege, RolePrivilege, UserRole],
        synchronize: config.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
      }),
    }),
    RolesModule,
    PrivilegesModule,
    UserRolesModule,
    PolicyModule,
    EventsModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
