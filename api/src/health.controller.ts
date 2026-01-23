import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'maia-api',
      version: '2.0.0',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  root() {
    return {
      name: 'Maia API',
      version: '2.0.0',
      docs: '/api/docs',
    };
  }
}
