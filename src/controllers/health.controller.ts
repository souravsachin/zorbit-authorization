import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../middleware/decorators';

@ApiTags('health')
@Controller('api/v1/G')
export class HealthController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy.' })
  check() {
    return {
      status: 'ok',
      service: 'zorbit-authorization',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('manifest')
  @Public()
  @ApiOperation({ summary: 'Module manifest', description: 'Returns the Zorbit module manifest (v2).' })
  @ApiResponse({ status: 200, description: 'Module manifest returned.' })
  getManifest(): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../zorbit-module-manifest.json');
  }
}
