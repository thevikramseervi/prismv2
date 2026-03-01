import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BiometricSyncService } from './biometric-sync.service';
import { BiometricImportService } from './biometric-import.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Biometric')
@Controller('biometric')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BiometricController {
  constructor(
    private readonly biometricSyncService: BiometricSyncService,
    private readonly biometricImportService: BiometricImportService,
  ) {}

  @Post('sync')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually trigger biometric sync (Super Admin only)' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date to sync (YYYY-MM-DD). Defaults to yesterday.' })
  @ApiResponse({ status: 200, description: 'Biometric sync triggered successfully' })
  async syncBiometric(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date(Date.now() - 86400000); // Yesterday
    return this.biometricSyncService.syncBiometricDataForDate(date);
  }

  @Post('upload')
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }), // 10MB
  )
  @ApiOperation({ summary: 'Upload biometric Excel file (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Biometric file imported and synced successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file (e.g. .xls not supported)' })
  async uploadBiometric(@UploadedFile() file?: { buffer: Buffer; originalname?: string }) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use form field name "file".');
    }
    const ext = file.originalname?.toLowerCase().slice(-5);
    if (!ext.includes('.xlsx')) {
      throw new BadRequestException(
        'Only .xlsx files are supported. Please convert .xls to .xlsx (e.g. open in Excel and Save As).',
      );
    }
    return this.biometricImportService.importFromBuffer(file.buffer);
  }

  @Get('unprocessed')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get unprocessed biometric logs (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Unprocessed logs retrieved successfully' })
  getUnprocessedLogs() {
    return this.biometricSyncService.getUnprocessedLogs();
  }
}
