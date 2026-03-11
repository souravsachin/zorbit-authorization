import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PolicyService } from '../services/policy.service';
import {
  AuthorizeRequestDto,
  AuthorizeResponseDto,
} from '../models/dto/authorize-request.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';

/**
 * Policy evaluation endpoint.
 * Other services call this to check if a user is authorized for an action.
 *
 * POST /api/v1/G/authorize
 *
 * This is a Global-scoped endpoint (G namespace) because authorization
 * decisions can span across namespaces.
 */
@Controller('api/v1/G')
@UseGuards(JwtAuthGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  /**
   * POST /api/v1/G/authorize
   * Evaluate an authorization policy decision.
   *
   * Returns { allowed: true/false } with reasoning.
   */
  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  async authorize(@Body() dto: AuthorizeRequestDto): Promise<AuthorizeResponseDto> {
    return this.policyService.evaluate(dto);
  }
}
