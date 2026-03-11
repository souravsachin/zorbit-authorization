import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PolicyService } from '../services/policy.service';
import {
  AuthorizeRequestDto,
  AuthorizeResponseDto,
} from '../models/dto/authorize-request.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';

/**
 * Policy evaluation endpoint.
 * Other services call this to check if a user is authorized for an action.
 */
@ApiTags('policy')
@ApiBearerAuth()
@Controller('api/v1/G')
@UseGuards(JwtAuthGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate authorization policy', description: 'Evaluate an authorization policy decision. Returns allowed/denied with reasoning.' })
  @ApiResponse({ status: 200, description: 'Authorization decision returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async authorize(@Body() dto: AuthorizeRequestDto): Promise<AuthorizeResponseDto> {
    return this.policyService.evaluate(dto);
  }
}
