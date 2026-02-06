import { Module } from '@nestjs/common';
import { BiometricSyncService } from './biometric-sync.service';
import { BiometricController } from './biometric.controller';

@Module({
  controllers: [BiometricController],
  providers: [BiometricSyncService],
  exports: [BiometricSyncService],
})
export class BiometricModule {}
