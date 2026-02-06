import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BiometricSyncService } from './biometric-sync.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Biometric')
@Controller('biometric')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BiometricController {
  constructor(private readonly biometricSyncService: BiometricSyncService) {}

  @Post('sync')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually trigger biometric sync (Super Admin only)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date to sync (YYYY-MM-DD). Defaults to yesterday.' })
  @ApiResponse({ status: 200, description: 'Biometric sync triggered successfully' })
  async syncBiometric(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date(Date.now() - 86400000); // Yesterday
    return this.biometricSyncService.syncBiometricDataForDate(date);
  }

  @Get('unprocessed')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get unprocessed biometric logs (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Unprocessed logs retrieved successfully' })
  getUnprocessedLogs() {
    return this.biometricSyncService.getUnprocessedLogs();
  }
}
