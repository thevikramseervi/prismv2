import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, LeaveStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Leave')
@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply for leave' })
  @ApiResponse({ status: 201, description: 'Leave application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient leave balance' })
  applyLeave(@CurrentUser() user: any, @Body() applyLeaveDto: ApplyLeaveDto) {
    return this.leaveService.applyLeave(user.id, applyLeaveDto);
  }

  @Get('my-applications')
  @ApiOperation({ summary: 'Get current user leave applications' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiResponse({ status: 200, description: 'Leave applications retrieved successfully' })
  getMyApplications(
    @CurrentUser() user: any,
    @Query('status') status?: LeaveStatus,
  ) {
    return this.leaveService.getMyApplications(user.id, status);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current user leave balance' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leave balance retrieved successfully' })
  getMyLeaveBalance(
    @CurrentUser() user: any,
    @Query('year') year?: string,
  ) {
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    return this.leaveService.getMyLeaveBalance(user.id, currentYear);
  }

  @Get('pending')
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all pending leave applications (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending applications retrieved successfully' })
  getPendingApplications() {
    return this.leaveService.getPendingApplications();
  }

  @Patch(':id/approve')
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve leave application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leave approved successfully' })
  @ApiResponse({ status: 404, description: 'Leave application not found' })
  approveLeave(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() reviewLeaveDto: ReviewLeaveDto,
  ) {
    return this.leaveService.approveLeave(id, user.id, reviewLeaveDto);
  }

  @Patch(':id/reject')
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject leave application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leave rejected successfully' })
  @ApiResponse({ status: 404, description: 'Leave application not found' })
  rejectLeave(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() reviewLeaveDto: ReviewLeaveDto,
  ) {
    return this.leaveService.rejectLeave(id, user.id, reviewLeaveDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel leave application' })
  @ApiResponse({ status: 200, description: 'Leave application cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Leave application not found' })
  cancelApplication(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leaveService.cancelApplication(id, user.id);
  }
}
