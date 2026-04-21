import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for seed endpoints. Behaves like JwtAuthGuard but allows
 * unauthenticated access when ALLOW_UNAUTHENTICATED_SEED=true.
 * This is needed for initial bootstrap when no admin user/privileges exist yet.
 */
@Injectable()
export class SeedAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(SeedAuthGuard.name);

  canActivate(context: ExecutionContext) {
    if (process.env.ALLOW_UNAUTHENTICATED_SEED === 'true') {
      this.logger.warn(
        'ALLOW_UNAUTHENTICATED_SEED is enabled — skipping JWT auth for seed endpoint',
      );
      // Attach a synthetic super-admin user so privilege guard also passes
      const request = context.switchToHttp().getRequest();
      request.user = {
        sub: 'BOOTSTRAP',
        email: 'bootstrap@system',
        privileges: ['platform.seed.execute'],
      };
      return true;
    }
    return super.canActivate(context);
  }
}
